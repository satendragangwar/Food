#!/usr/bin/env node

const NutritionEstimator = require('./src/index');
const readline = require('readline');

/**
 * Process a dish and print results
 * @param {string} dishName - The name of the dish
 * @param {NutritionEstimator} nutritionEstimator - The estimator instance
 */
async function processDish(dishName, nutritionEstimator) {
  try {
    // Basic validation before processing
    if (!dishName || typeof dishName !== 'string' || dishName.trim().length < 3) {
      console.log('\n❌ Error:');
      console.log(`Invalid dish name: "${dishName}". Name must be at least 3 characters long.`);
      return;
    }

    console.log(`\nAnalyzing "${dishName}"...`);
    const result = await nutritionEstimator.estimateNutrition(dishName);
    
    if (result.error) {
      console.log('\n❌ Error:');
      console.log(result.message);
      if (result.suggestion) {
        console.log(result.suggestion);
      }
      return;
    }
    
    // Only show results if there's no error
    console.log('\n✅ Results:');
    console.log(`\nDish: ${result.dish_name}`);
    console.log(`Type: ${result.dish_type}`);
    console.log(`Serving Size: ${result.serving_size.household_measure} (${result.serving_size.grams}g)`);
    
    console.log('\nNutrition per serving:');
    console.log(`Calories: ${result.estimated_nutrition_per_serving.calories} kcal`);
    console.log(`Protein: ${result.estimated_nutrition_per_serving.protein}g`);
    console.log(`Carbs: ${result.estimated_nutrition_per_serving.carbs}g`);
    console.log(`Fat: ${result.estimated_nutrition_per_serving.fat}g`);
    console.log(`Fiber: ${result.estimated_nutrition_per_serving.fiber}g`);
    
    console.log('\nIngredients:');
    result.ingredients_used.forEach(ingredient => {
      console.log(`- ${ingredient.ingredient}: ${ingredient.quantity}`);
    });
    
    if (result.cooking_instructions) {
      console.log('\nCooking Instructions:');
      console.log(result.cooking_instructions);
    }
  } catch (error) {
    console.error('\n❌ Application Error:');
    console.error(error);
  }
}

/**
 * Set up command line interface
 */
function setupCLI() {
  // Check if dish name was provided as command line argument
  const args = process.argv.slice(2);
  let dishName = '';
  
  if (args.length > 0) {
    dishName = args.join(' ');
    const nutritionEstimator = new NutritionEstimator();
    
    processDish(dishName, nutritionEstimator)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  
    console.log('===============================================');
    console.log('🍛 Indian Dish Nutrition Estimator');
    console.log('===============================================');
    console.log('Enter a dish name to estimate nutrition, or type "exit" to quit.');
    console.log('');
  
    const nutritionEstimator = new NutritionEstimator();
  
    const prompt = () => {
      rl.question('Enter dish name: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('Thank you for using the Nutrition Estimator. Goodbye!');
          rl.close();
          return;
        }
        
        await processDish(input, nutritionEstimator);
        
        console.log('\n-----------------------------------------------');
        prompt();
      });
    };
  
    prompt();
  }
}

// Run the CLI
setupCLI(); 