from flask_cors import CORS
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = MongoClient("mongodb://localhost:27017/")
db = client["truesight_ai"]
collection = db["detections"]
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

    return jsonify({
        "prediction": prediction,
        "confidence": confidence
    })
   

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json

    users.insert_one({
        "username": data["username"],
        "password": data["password"],
        "plan": "free",
        "credits": 5
    })

    return jsonify({"message": "User created"})
@app.route("/login", methods=["POST"])
def login():
  data = request.json

  user = users.find_one({
    "username": data["username"],
    "password": data["password"]
})

  if user:

    # 👉 FREE PLAN CHECK
    if user.get("plan", "free") == "free":
        if user.get("credits", 0) <= 0:
            return jsonify({
                "error": "Limit reached. Upgrade to premium 💎"
            })

    return jsonify({
        "status": "success",
        "plan": user.get("plan", "free"),
        "credits": user.get("credits", 0)
    })

  else:
    return jsonify({"status": "fail"})



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


@app.route("/history", methods=["GET"])
def get_history():
    data = list(collection.find({}, {"_id": 0}))
    return jsonify(data)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

if __name__ == "__main__":
    app.run(debug=True)
