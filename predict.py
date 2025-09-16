import sys
import pickle
import pandas as pd
import numpy as np
import json

# Get command-line arguments passed from Node.js
# The arguments are: Brand, Model, Kms_driven, Year, fuel_type, Transmission
brand = sys.argv[1]
model = sys.argv[2]
kms_driven = float(sys.argv[3])
year = int(sys.argv[4])
fuel_type = sys.argv[5]
transmission = sys.argv[6]

try:
    # Load the trained model from the pickle file
    with open('car_price_model.pkl', 'rb') as file:
        model_pipeline = pickle.load(file)

    # Create a DataFrame for the new data point
    input_data = pd.DataFrame({
        'Brand': [brand],
        'Model': [model],
        'Kms_driven': [np.log1p(kms_driven)],  # Apply the same log transformation
        'Year': [year],
        'fuel_type': [fuel_type],
        'Transmission': [transmission]
    })
    
    # Use the model to make a prediction
    # The pipeline handles all preprocessing automatically
    predicted_log_price = model_pipeline.predict(input_data)
    
    # Convert the log-transformed price back to the original scale
    predicted_price = np.expm1(predicted_log_price[0])

    # Print the result as a JSON object for Node.js to read
    result = {
        'predicted_price': round(float(predicted_price), 2)
    }
    print(json.dumps(result))

except Exception as e:
    # Print an error message if something goes wrong
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)