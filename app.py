
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return "TrueSight AI Backend is Running 🚀"

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    # temporary success (later DB)
    return jsonify({"message": "Signup success"}), 200


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = MongoClient("mongodb://localhost:27017/")
db = client["truesight"]
users = db["users"]

def predict_image(filepath):
    # Dummy AI (for now)
    return "REAL", 0.95

@app.route("/detect_image", methods=["POST"])
def detect_image():
     
     
    file = request.files["file"]

    filename = file.filename
    filepath = os.path.join("uploads", filename)
    file.save(filepath)

    # 👉 AI prediction
    prediction, confidence = predict_image(filepath)

    # 👉 Save to MongoDB
    collection.insert_one({
        "filename": filename,
        "prediction": prediction,
        "confidence": confidence
    })

    history.insert_one({
    "email": request.form.get("username"),
    "filename": filename,
    "prediction": prediction,
    "confidence": confidence
})

    return jsonify({
        "prediction": prediction,
        "confidence": confidence
    })
   

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


@app.route("/stats", methods=["GET"])
def stats():
    total = collection.count_documents({})
    real = collection.count_documents({"prediction": "REAL"})
    fake = collection.count_documents({"prediction": "FAKE"})

    return jsonify({
        "total": total,
        "real": real,
        "fake": fake
    })

@app.route("/detect_video", methods=["POST"])
def detect_video():
    file = request.files["file"]

    filepath = "uploads/" + file.filename
    file.save(filepath)

    import cv2
    cap = cv2.VideoCapture(filepath)

    frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames += 1

    cap.release()

    return jsonify({
        "message": "Video processed",
        "frames": frames
    })


history = db["history"]

@app.route("/history/<email>", methods=["GET"])
def get_history(email):
    data = list(history.find({"email": email}, {"_id": 0}))
    return jsonify(data)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)

