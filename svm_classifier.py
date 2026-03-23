import numpy as np
from sklearn.svm import SVC

# --- SVM Model for Authenticity Classification ---
# This serves as a plug-and-play module for your SVM model.
# Currently it uses a dummy dataset based on Sharpness, Contrast, and Brightness.
# Replace X_dummy and y_dummy with your actual loaded dataset.

X_dummy = np.array([
    [100, 50, 100], [120, 60, 110], [140, 55, 105], # Labels: 0 (Real Image)
    [1200, 80, 150], [1100, 85, 160], [1300, 90, 140], # Labels: 1 (AI Generated)
    [500, 60, 120], [600, 65, 130], [550, 70, 125]  # Labels: 2 (Download Image)
])
y_dummy = np.array([0, 0, 0, 1, 1, 1, 2, 2, 2])

# Initialize and train the model
svm_model = SVC(kernel='linear')
svm_model.fit(X_dummy, y_dummy)

def predict_authenticity(sharpness, contrast, brightness):
    """
    Predicts the authenticity of an image using the trained SVM model.
    """
    features = np.array([[sharpness, contrast, brightness]])
    svm_pred = svm_model.predict(features)[0]
    
    if svm_pred == 1:
        return "AI Generated"
    elif svm_pred == 0:
        return "Real Image"
    else:
        return "Download Image"
