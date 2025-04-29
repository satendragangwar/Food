#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Paths
const inputFilePath = path.resolve(__dirname, '../Assignment Inputs - Nutrition source.csv');
const outputFilePath = path.resolve(__dirname, '../data/processedNutritionDB.csv');

// Selected nutrition columns to keep
const selectedColumns = [
  'food_name',
  'energy_kcal',
  'protein_g',
  'carb_g',
  'fat_g',
  'fibre_g'
];

// Map of column names in source to column names in our output
const columnMap = {
  'food_name': 'ingredient',
  'energy_kcal': 'calories_per_100g',
  'protein_g': 'protein_per_100g',
  'carb_g': 'carbs_per_100g',
  'fat_g': 'fat_per_100g',
  'fibre_g': 'fiber_per_100g'
};

// Common Indian ingredient names to create synonyms
const synonymsMap = {
  // Legumes
  'chana': 'gram',
  'rajma': 'kidney bean',
  'masoor': 'lentil',
  'toor dal': 'pigeon pea',
  'urad dal': 'black gram',
  'moong dal': 'green gram',
  'besan': 'gram flour',
  
  // Spices
  'haldi': 'turmeric',
  'jeera': 'cumin',
  'dhania': 'coriander',
  'mirch': 'chili',
  'elaichi': 'cardamom',
  'laung': 'clove',
  'dalchini': 'cinnamon',
  'saunf': 'fennel',
  'ajwain': 'carom',
  'hing': 'asafoetida',
  
  // Vegetables
  'aloo': 'potato',
  'gobhi': 'cauliflower',
  'matar': 'pea',
  'palak': 'spinach',
  'tamatar': 'tomato',
  'bhindi': 'okra',
  'pyaaz': 'onion',
  'adrak': 'ginger',
  'lehsun': 'garlic',
  
  // Grains
  'chawal': 'rice',
  'atta': 'wheat flour',
  'maida': 'refined flour',
  'besan': 'gram flour',
  'sooji': 'semolina',
  
  // Dairy
  'dahi': 'yogurt',
  'paneer': 'cottage cheese',
  'makhan': 'butter',
  'ghee': 'clarified butter',
  
  // Others
  'phal': 'fruit',
  'mirch': 'chili',
  'nimbu': 'lemon',
  'nariyal': 'coconut'
};

// Process the data
async function processNutritionData() {
  const results = [];
  const processedIngredients = new Set();
  
  console.log('Starting to process nutrition data...');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Create a processed row with selected columns
        const processedRow = {};
        
        // Map columns from source to our format
        for (const srcCol of selectedColumns) {
          if (row[srcCol]) {
            const destCol = columnMap[srcCol];
            // Convert to lowercase for ingredient names, keep as numeric for others
            if (srcCol === 'food_name') {
              // Clean and normalize the ingredient name
              const ingredientName = row[srcCol].toLowerCase()
                .replace(/[^\w\s]/g, '') // Remove punctuation
                .replace(/\s+/g, '_')    // Replace spaces with underscores
                .trim();                 // Trim whitespace
              processedRow[destCol] = ingredientName;
            } else {
              processedRow[destCol] = parseFloat(row[srcCol]) || 0;
            }
          } else {
            // Set default value if column is missing
            const destCol = columnMap[srcCol];
            processedRow[destCol] = srcCol === 'food_name' ? '' : 0;
          }
        }
        
        // Only add rows with valid ingredient names
        if (processedRow.ingredient && !processedIngredients.has(processedRow.ingredient)) {
          results.push(processedRow);
          processedIngredients.add(processedRow.ingredient);
        }
      })
      .on('end', () => {
        // Convert to CSV
        const header = Object.values(columnMap).join(',');
        const rows = results.map(row => 
          Object.values(columnMap).map(col => row[col] !== undefined ? row[col] : '').join(',')
        );
        
        const csvContent = [header, ...rows].join('\n');
        
        // Write to file
        fs.writeFileSync(outputFilePath, csvContent);
        
        console.log(`Processed ${results.length} ingredients`);
        console.log(`Output saved to ${outputFilePath}`);
        
        // Create a synonyms JSON file
        const synonymsData = {};
        
        // Add synonyms based on our map
        for (const [indian, english] of Object.entries(synonymsMap)) {
          // Find if the english term exists in our processed data
          const englishBase = english.replace(/\s+/g, '_');
          const englishIngredient = results.find(row => 
            row.ingredient.includes(englishBase)
          );
          
          if (englishIngredient) {
            synonymsData[indian] = englishIngredient.ingredient;
            // Add variations
            synonymsData[`${indian}s`] = englishIngredient.ingredient;
            synonymsData[`${indian} powder`] = englishIngredient.ingredient; // e.g., haldi powder -> turmeric
            synonymsData[`${english} powder`] = englishIngredient.ingredient; // e.g., turmeric powder -> turmeric
            synonymsData[`${english} paste`] = englishIngredient.ingredient; // e.g., ginger paste -> ginger
          }
        }

        // Add specific common AI variations
        const commonVariations = {
            'plain yogurt': 'yogurt',
            'heavy cream': 'cream',
            'ginger-garlic paste': 'ginger_garlic_paste', // Assuming DB might have this or map individually
            'ginger garlic paste': 'ginger_garlic_paste',
            'cooking oil': 'oil',
            'vegetable oil': 'oil',
            'sunflower oil': 'sunflower_oil',
            'olive oil': 'olive_oil',
            'red chili powder': 'chili_powder_red', // Map to specific red chili if possible
            'red chilli powder': 'chili_powder_red',
            'chili powder': 'chili_powder', // General chili powder
            'chilli powder': 'chili_powder',
            'turmeric powder': 'turmeric',
            'chicken breast': 'chicken_breast',
            'chicken breast boneless skinless': 'chicken_breast',
            'boneless skinless chicken breast': 'chicken_breast',
            'boneless chicken': 'chicken',
            'coconut milk': 'coconut_milk',
            'cilantro': 'coriander_leaves', // Map cilantro to coriander leaves
            'coriander leaves': 'coriander_leaves',
            'whipping cream': 'cream'
        };

        for (const [variation, base] of Object.entries(commonVariations)) {
            const baseIngredient = results.find(row => row.ingredient.includes(base.replace(/\s+/g, '_')));
            if (baseIngredient) {
                 synonymsData[variation] = baseIngredient.ingredient;
                 // Add variations of the variation
                 synonymsData[`${variation} chopped`] = baseIngredient.ingredient;
                 synonymsData[`${variation}, chopped`] = baseIngredient.ingredient;
            } else if (base === 'ginger_garlic_paste') {
                // Handle compound paste separately if needed
                const ginger = results.find(row => row.ingredient.includes('ginger'));
                const garlic = results.find(row => row.ingredient.includes('garlic'));
                if (ginger || garlic) {
                    // For simplicity, map to ginger if available, else garlic. 
                    // A better approach might split the quantity later.
                    synonymsData[variation] = ginger ? ginger.ingredient : garlic.ingredient;
                }
            }
        }
        
        // Also add variations of processed ingredients
        results.forEach(row => {
          const ingredient = row.ingredient;
          const ingredientSpaced = ingredient.replace(/_/g, ' ');
          // Add without underscores
          synonymsData[ingredientSpaced] = ingredient;
          // Add plural form (simple 's')
          synonymsData[`${ingredientSpaced}s`] = ingredient;
          // Add common descriptors if not already a synonym
          if (!synonymsData[`${ingredientSpaced} powder`]) synonymsData[`${ingredientSpaced} powder`] = ingredient;
          if (!synonymsData[`${ingredientSpaced} leaves`]) synonymsData[`${ingredientSpaced} leaves`] = ingredient;
          if (!synonymsData[`${ingredientSpaced} paste`]) synonymsData[`${ingredientSpaced} paste`] = ingredient;
          if (!synonymsData[`${ingredientSpaced} seeds`]) synonymsData[`${ingredientSpaced} seeds`] = ingredient;
        });
        
        // Write synonyms to file
        fs.writeFileSync(
          path.resolve(__dirname, '../data/ingredientSynonyms.json'),
          JSON.stringify(synonymsData, null, 2)
        );
        
        console.log(`Created ingredient synonyms with ${Object.keys(synonymsData).length} mappings`);
        
        resolve();
      })
      .on('error', (error) => {
        console.error('Error processing nutrition data:', error);
        reject(error);
      });
  });
}

// Run the processing
processNutritionData().catch(console.error); 