const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();
const port = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Data to be passed to the frontend
let categories = {};
let modelsByBrand = {};

// Function to load the car data and prepare the modelsByBrand object
async function loadCarData() {
    return new Promise((resolve, reject) => {
        const brands = new Set();
        const fuel_types = new Set();
        const transmissions = new Set();
        
        fs.createReadStream('car details v4.csv')
            .pipe(csv())
            .on('data', (row) => {
                if (!modelsByBrand[row['Make']]) {
                    modelsByBrand[row['Make']] = new Set();
                }
                modelsByBrand[row['Make']].add(row['Model']);
                brands.add(row['Make']);
                fuel_types.add(row['Fuel Type']);
                transmissions.add(row['Transmission']);
            })
            .on('end', () => {
                // Convert sets to sorted arrays for better display
                for (const brand in modelsByBrand) {
                    modelsByBrand[brand] = [...modelsByBrand[brand]].sort();
                }
                categories = {
                    brands: [...brands].sort(),
                    fuel_types: [...fuel_types].sort(),
                    transmissions: [...transmissions].sort()
                };
                console.log('Car data loaded successfully.');
                resolve();
            })
            .on('error', (err) => {
                console.error('Error loading car data:', err);
                reject(err);
            });
    });
}

// Load data before the server starts listening
loadCarData().then(() => {
    // GET route to render the form
    app.get('/', (req, res) => {
        res.render('index', { categories, modelsByBrand });
    });

    // POST route to handle form submission and prediction
    app.post('/predict', (req, res) => {
        const { brand, model, kms_driven, year, fuel_type, transmission } = req.body;
        
        console.log('Received input:', req.body);

        const pythonPath = '/Users/kunjanpandey/Desktop/Projects/CarProject/.venv/bin/python';

        const pythonProcess = spawn(pythonPath, [
            'predict.py',
            brand,
            model,
            kms_driven,
            year,
            fuel_type,
            transmission
        ]);

        let predictionOutput = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            predictionOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                console.error(`Error: ${errorOutput}`);
                return res.status(500).send('Prediction failed.');
            }

            try {
                const result = JSON.parse(predictionOutput);
                res.render('index', { prediction: result.predicted_price, categories, modelsByBrand });
            } catch (e) {
                console.error('Failed to parse JSON output:', predictionOutput);
                res.status(500).send('Invalid response from prediction script.');
            }
        });
    });
    
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Server failed to start due to data loading error.');
});