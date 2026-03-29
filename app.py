from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os

app = Flask(__name__)
CORS(app)

# ================= DB =================
client = MongoClient("mongodb://localhost:27017/")
db = client["truesight"]

users = db["users"]
history = db["history"]

# ================= HOME =================
@app.route("/")
def home():
    return "TrueSight AI Backend is Running 🚀"

# ================= SIGNUP =================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    # Check if user exists
    if users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(password)

    users.insert_one({
        "email": email,
        "password": hashed_password
    })

    return jsonify({"message": "Signup success"})

# ================= LOGIN =================
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    user = users.find_one({"email": data.get("email")})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user["password"], data.get("password")):
        return jsonify({"error": "Wrong password"}), 401

    return jsonify({"message": "Login success"})

# ================= UPLOAD =================
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def predict_image(filepath):
    return "REAL", 0.95

@app.route("/detect_image", methods=["POST"])
def detect_image():
    file = request.files["file"]
    email = request.form.get("username")

    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    prediction, confidence = predict_image(filepath)

    history.insert_one({
        "email": email,
        "filename": filename,
        "prediction": prediction,
        "confidence": confidence
    })

    return jsonify({
        "prediction": prediction,
        "confidence": confidence
    })

# ================= HISTORY =================
@app.route("/history/<email>", methods=["GET"])
def get_history(email):
    data = list(history.find({"email": email}, {"_id": 0}))
    return jsonify(data)

# ================= STATS =================
@app.route("/stats", methods=["GET"])
def stats():
    total = history.count_documents({})
    real = history.count_documents({"prediction": "REAL"})
    fake = history.count_documents({"prediction": "FAKE"})

    return jsonify({
        "total": total,
        "real": real,
        "fake": fake
    })

# ================= FILE SERVE =================
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

# ================= RUN =================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)