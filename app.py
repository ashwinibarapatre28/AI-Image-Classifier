from flask import Flask, request, jsonify, render_template
import cv2
import numpy as np
from ultralytics import YOLO
from collections import Counter
import base64

app = Flask(__name__)

# Load YOLO object detection model (using yolov8n for speed and good accuracy)
model = YOLO('yolov8n.pt')

def analyze_image(image_bytes):
    try:
        # Convert image bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        # Decode image using OpenCV
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Could not decode image"}
        
        # Run YOLO inference
        results = model(img)
        
        # Get the original image without bounding boxes
        _, buffer = cv2.imencode('.jpg', img)
        annotated_image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Get image resolution
        height, width, _ = img.shape
        resolution = f"{width} x {height}"
        
        detected_objects = []
        confidences = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # get class name corresponding to the detected object
                cls_id = int(box.cls[0])
                class_name = model.names[cls_id]
                detected_objects.append(class_name)
                confidences.append(float(box.conf[0]))

        # Calculate accuracy (YOLO Confidence)
        accuracy = round(sum(confidences) / len(confidences) * 100, 2) if confidences else 0.0

        # Calculate Image Quality metrics
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = np.mean(gray)
        contrast = gray.std()
        
        quality = 0.5 * sharpness + 0.3 * contrast + 0.2 * brightness

        # Background Detection
        if brightness < 50:
            background = "Dark Background"
        elif brightness > 200:
            background = "White Background"
        else:
            background = "Mixed Background"

        # Authenticity Detection (Heuristic based on Sharpness & Quality)
        if sharpness > 1000:
            authenticity = "AI Generated"
        elif sharpness < 150:
            authenticity = "Real Image"
        else:
            authenticity = "Download Image"

        # Count identical objects
        obj_counts = Counter(detected_objects)
        person_count = obj_counts.get("person", 0)
    
        prediction = "Uncategorized"
        description = "This image contains various objects, but does not fit our specific categories."
        
        # Format detected objects for output as requested
        if not obj_counts:
            detected_str = "No recognizable objects detected"
            prediction = "Unknown"
            description = "No recognizable objects were detected in the image."
        else:
            detected_str = ", ".join([f"{obj} ({count})" for obj, count in obj_counts.items()])
            
            # Retrieve logical counts
            building_count = obj_counts.get("building", 0) + obj_counts.get("house", 0)
            car_count = obj_counts.get("car", 0)
            truck_count = obj_counts.get("truck", 0)
            tree_count = obj_counts.get("tree", 0) + obj_counts.get("potted plant", 0)
            grass_count = obj_counts.get("grass", 0)
            road_count = obj_counts.get("road", 0) + obj_counts.get("traffic light", 0) + obj_counts.get("stop sign", 0)
            
            # Object Detection Rules base on the criteria
            # Group Photo: Many "person" objects
            if person_count >= 3 and building_count == 0:
                prediction = "Group Photo"
                description = "The image appears to contain several people standing together, possibly during an event or gathering."
                
            # People near a building: "person" and "building" are detected
            elif person_count >= 1 and building_count >= 1:
                prediction = "People near a building"
                description = "The image shows a group of people standing in front of a building."
                
            # Urban Scene: "car", "road", and "building"
            elif (car_count >= 1 or road_count >= 1) and building_count >= 1:
                prediction = "Urban Scene"
                description = "The image appears to show a city or street environment."
                
            # Animal/Pet Photo
            elif obj_counts.get("dog", 0) >= 1 or obj_counts.get("cat", 0) >= 1:
                prediction = "Animal Photo"
                description = "The image features an animal, such as a dog or a cat."

            # Nature Scene: "tree" and "grass" dominate
            elif tree_count >= 1 or grass_count >= 1 or obj_counts.get("bird") or obj_counts.get("cow") or obj_counts.get("sheep"):
                prediction = "Nature Scene"
                description = "The image appears to show a natural outdoor environment."
                
            # Fallback to single/small groups
            elif person_count == 1:
                prediction = "Portrait"
                description = "The image contains a single person."
                
            elif person_count == 2:
                prediction = "Small Group"
                description = "The image contains two people."
                 
        return {
            "prediction": prediction,
            "description": description,
            "detected_objects": detected_str,
            "total_persons": person_count,
            "accuracy": round(accuracy, 2),
            "quality": round(quality, 2),
            "sharpness": round(sharpness, 2),
            "background": background,
            "authenticity": authenticity,
            "resolution": resolution,
            "annotated_image": f"data:image/jpeg;base64,{annotated_image_base64}"
        }
    except Exception as e:
        return {"error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    try:
        image_bytes = file.read()
        result = analyze_image(image_bytes)
        
        if "error" in result:
            return jsonify({'error': result["error"]}), 500
            
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': "Invalid image file"}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)