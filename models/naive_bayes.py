import os
import cv2
import numpy as np
from sklearn.naive_bayes import GaussianNB

class NaiveBayesImageClassifier:
    def __init__(self):
        """
        Initialize the Gaussian Naive Bayes Model
        """
        self.model = GaussianNB()
        self.is_trained = False
        self.categories = []

    def extract_features(self, img):
        """
        Extracts Color Histogram features from an OpenCV image array.
        Color histograms are highly effective generic features for Naive Bayes classification.
        """
        if img is None:
            return None
        
        # Resize to standard size to ensure consistent processing
        img = cv2.resize(img, (128, 128))
        
        # Convert to HSV color space which is more robust to lighting changes
        hsv_img = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Calculate 3D histogram (Hue, Saturation, Value)
        hist = cv2.calcHist([hsv_img], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        
        # Normalize and flatten the histogram to be used as a 1D feature array
        cv2.normalize(hist, hist)
        return hist.flatten()

    def train_model(self, dataset_path):
        """
        Trains the Naive Bayes model using images from a dataset folder.
        It expects a folder structure like:
        dataset/
            Real_Image/
                img1.jpg...
            AI_Generated/
                ...
        """
        X = []
        y = []
        
        # Automatically determine categories based on folder names
        self.categories = [d for d in os.listdir(dataset_path) if os.path.isdir(os.path.join(dataset_path, d))]
        
        print(f"Loading images from categories: {self.categories}")
        
        for label_idx, category in enumerate(self.categories):
            category_path = os.path.join(dataset_path, category)
            for file in os.listdir(category_path):
                img_path = os.path.join(category_path, file)
                
                # Load image
                img = cv2.imread(img_path)
                
                # Extract its features
                features = self.extract_features(img)
                if features is not None:
                    X.append(features)
                    y.append(label_idx)
        
        if len(X) > 0:
            self.model.fit(np.array(X), np.array(y))
            self.is_trained = True
            print("Naive Bayes Model trained successfully.")
            return True
        else:
            print("No valid images found for training.")
            return False

    def predict_image(self, img_path_or_array):
        """
        Predicts the class of an image using the trained Naive Bayes model.
        Accepts either an image path (string) or an OpenCV image array.
        """
        if not self.is_trained:
            return "Model not trained yet."
            
        if isinstance(img_path_or_array, str):
            img = cv2.imread(img_path_or_array)
        else:
            img = img_path_or_array

        features = self.extract_features(img)
        if features is None:
            return "Error: Could not read image."
            
        # Model expects a 2D array of features
        features = np.array([features])
        prediction_idx = self.model.predict(features)[0]
        
        return self.categories[prediction_idx]

# --- Example Usage ---
if __name__ == "__main__":
    classifier = NaiveBayesImageClassifier()
    
    # 1. To train the model, you would point it to a dataset directory containing your classified image folders:
    # dataset_path = "dataset/"
    # classifier.train_model(dataset_path)
    
    # 2. To predict a single image path:
    # test_image_path = "test_image.jpg"
    # prediction = classifier.predict_image(test_image_path)
    # print(f"This image is classified as: {prediction}")
