import requests

url = "http://127.0.0.1:5000/detect_image"

files = {"file": open("test.jpg", "rb")}

response = requests.post(url, files=files)

print(response.json())
