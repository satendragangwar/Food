class NutritionCalculator {
  constructor(ingredientMapper, quantityStandardizer) {
    this.ingredientMapper = ingredientMapper;
    this.quantityStandardizer = quantityStandardizer;
    this.householdMeasurements = require('../../data/householdMeasurements.json');
  }

  /**
   * Validates if a dish name is valid
   * @param {string} name - The dish name to validate
   * @returns {boolean} - Whether the dish name is valid
   */
  isValidDishName(name) {
    // Must be at least 3 characters long
    if (name.length < 3) {
      return false;
    }
    
    // Must contain at least one letter
    if (!/[a-z]/i.test(name)) {
      return false;
    }
    
    // Can only contain letters, spaces, hyphens, and basic punctuation
    return /^[a-z\s\-',.()]{3,}$/i.test(name);
  }

  /**
   * Calculate nutrition for a list of ingredients
   * @param {Array} ingredients - List of ingredients with name and quantity
   * @returns {Promise<Object>} - Total nutrition values and processed ingredients
   */
  async calculateNutrition(ingredients) {
    const processedIngredients = [];
    let totalNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };
    
    let totalWeightInGrams = 0;
    
    // Process ingredients asynchronously because mapping might involve AI calls
    await Promise.all(ingredients.map(async (ingredient) => {
      let mappedName = null;
      let nutritionData = null;
      let quantityInGrams = 0;
      let ingredientNutrition = null;
      let errorMsg = null;

      try {
        const ingredientName = ingredient.name.toLowerCase().trim();
        
        // Get nutrition data from database (now async)
        nutritionData = await this.ingredientMapper.getNutritionData(ingredientName);
        
        if (!nutritionData) {
          // Error already logged by getNutritionData if mapping failed
        } else {
          mappedName = nutritionData.ingredient; // Store the successfully mapped name
          
          // Standardize quantity to grams - PASS MAPPED NAME
          quantityInGrams = this.quantityStandardizer.standardizeToGrams(
            ingredient.standardQuantity || ingredient.quantity, 
            mappedName // Use mapped name for standardization context
          );
          
          // Calculate nutrition based on quantity
          ingredientNutrition = {
            calories: (parseFloat(nutritionData.calories_per_100g || 0) * quantityInGrams) / 100,
            protein: (parseFloat(nutritionData.protein_per_100g || 0) * quantityInGrams) / 100,
            carbs: (parseFloat(nutritionData.carbs_per_100g || 0) * quantityInGrams) / 100,
            fat: (parseFloat(nutritionData.fat_per_100g || 0) * quantityInGrams) / 100,
            fiber: (parseFloat(nutritionData.fiber_per_100g || 0) * quantityInGrams) / 100
          };
          
          // Validate values to avoid NaN
          for (const key in ingredientNutrition) {
            if (isNaN(ingredientNutrition[key])) {
              console.warn(`Invalid ${key} value for ${ingredientName} (mapped: ${mappedName}), setting to 0`);
              ingredientNutrition[key] = 0;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ingredient ${ingredient.name}:`, error);
        errorMsg = error.message;
      }

      // Push results regardless of success/failure for tracking
      processedIngredients.push({
        ingredient: ingredient.name, // Keep original name for reference
        mappedName: mappedName, // Store the name it mapped to (or null)
        quantity: ingredient.standardQuantity || ingredient.quantity,
        weight_g: quantityInGrams,
        nutrition: ingredientNutrition,
        error: errorMsg
      });
    }));

    // Aggregate totals from successfully processed ingredients
    processedIngredients.forEach(procIngredient => {
      if (procIngredient.nutrition) {
        totalWeightInGrams += procIngredient.weight_g;
        totalNutrition.calories += procIngredient.nutrition.calories;
        totalNutrition.protein += procIngredient.nutrition.protein;
        totalNutrition.carbs += procIngredient.nutrition.carbs;
        totalNutrition.fat += procIngredient.nutrition.fat;
        totalNutrition.fiber += procIngredient.nutrition.fiber;
      }
    });
    
    // Validate total nutrition values to avoid NaN
    for (const key in totalNutrition) {
      if (isNaN(totalNutrition[key])) {
        console.warn(`Invalid total ${key} value, setting to 0`);
        totalNutrition[key] = 0;
      }
    }
    
    return {
      totalNutrition,
      processedIngredients,
      totalWeightInGrams
    };
  }

  /**
   * Calculate nutrition per standard serving
   * @param {Object} totalNutrition - Total nutrition values
   * @param {number} totalWeight - Total weight of the dish in grams
   * @param {string} dishType - The type of dish
   * @returns {Object} - Nutrition per standard serving
   */
  calculatePerServing(totalNutrition, totalWeight, dishType) {
    if (!this.householdMeasurements.foodTypes[dishType]) {
      console.warn(`Unknown dish type: ${dishType}, using default serving size`);
      // Default to a generic serving size
      const defaultServingSize = 150;
      const ratio = defaultServingSize / (totalWeight || 1); // Avoid division by 0
      
      return {
        serving_size_g: defaultServingSize,
        calories: Math.round(totalNutrition.calories * ratio) || 0,
        protein: Math.round(totalNutrition.protein * ratio * 10) / 10 || 0,
        carbs: Math.round(totalNutrition.carbs * ratio * 10) / 10 || 0,
        fat: Math.round(totalNutrition.fat * ratio * 10) / 10 || 0,
        fiber: Math.round(totalNutrition.fiber * ratio * 10) / 10 || 0
      };
    }
    
    const servingSize = this.householdMeasurements.foodTypes[dishType].serving;
    const ratio = servingSize / (totalWeight || 1); // Avoid division by 0
    
    const result = {
      serving_size_g: servingSize,
      calories: Math.round(totalNutrition.calories * ratio) || 0,
      protein: Math.round(totalNutrition.protein * ratio * 10) / 10 || 0,
      carbs: Math.round(totalNutrition.carbs * ratio * 10) / 10 || 0,
      fat: Math.round(totalNutrition.fat * ratio * 10) / 10 || 0,
      fiber: Math.round(totalNutrition.fiber * ratio * 10) / 10 || 0
    };
    
    // Final validation to avoid NaN values
    for (const key in result) {
      if (isNaN(result[key])) {
        console.warn(`Invalid ${key} value in result, setting to 0`);
        result[key] = 0;
      }
    }
    
    return result;
  }
}

module.exports = NutritionCalculator; 