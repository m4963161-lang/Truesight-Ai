from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os

app = Flask(__name__)
CORS(app)

# ================= DB =================

client = MongoClient(
    "mongodb+srv://m4963161_db_user:<db_password>@cluster0.nmyolcj.mongodb.net/?appName=Cluster0",
    serverSelectionTimeoutMS=5000
)

db = client["truesight"]

collection = db["images"]
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

    if users.find_one({"email": email}):
        return jsonify({"error": "User already exists"})

    users.insert_one({
        "email": email,
        "password": password
    })

    return jsonify({"message": "Signup success"})

# ================= LOGIN =================
@app.route("/login", methods=["POST"])
def login():
    data = request.json

    user = users.find_one({
        "email": data["email"],
        "password": data["password"]
    })

    if not user:
        return jsonify({"error": "Invalid credentials"})

    return jsonify({"message": "Login success"})

# ================= UPLOAD =================
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def predict_image(filepath):
    return "REAL", 0.95

@app.route("/detect_image", methods=["POST"])
def detect_image():
    try:
        print("REQUEST RECEIVED")

        if "file" not in request.files:
            print("No file in request")
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        email = request.form.get("username")

        print("File:", file.filename)
        print("User:", email)

        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        prediction, confidence = predict_image(filepath)

        history.insert_one({
            "email": email,
            "filename": file.filename,
            "prediction": prediction,
            "confidence": confidence
        })

        return jsonify({
            "prediction": prediction,
            "confidence": confidence
        })

    except Exception as e:
        print("ERROR OCCURRED:", str(e))
        return jsonify({"error": str(e)}), 500

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