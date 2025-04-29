const { generateObject, generateText } = require("ai");
const { google } = require("@ai-sdk/google");
const fs = require("fs");
const path = require("path");
const dummyRecipes = require("../../data/dummyRecipes.json");
const { z } = require("zod");

class RecipeFetcher {
  constructor(apiKey, aiModel) {
    // The AI SDK will automatically use GOOGLE_GENERATIVE_AI_API_KEY environment variable if apiKey is not provided
    this.useAiSdk = !!apiKey || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !!aiModel;
    this.apiKey = apiKey; // This will be used if provided, otherwise SDK defaults to env var
    this.aiModel = aiModel; // Use the passed model if available
    this.dummyRecipes = dummyRecipes;
    
    // List of known Indian dishes for validation
    this.knownDishes = this.loadKnownDishes();
  }
  
  /**
   * Load a list of known Indian dishes for validation
   * @returns {Array<string>} - List of known dish names
   */
  loadKnownDishes() {
    // Start with dishes from our dummy data
    const knownDishes = Object.keys(this.dummyRecipes);
    
    // Add common Indian dishes
    const commonDishes = [
      "aloo gobi", "aloo matar", "aloo paratha", "aloo tikki", "aloo bhaji",
      "baingan bharta", "bhindi masala", "butter chicken", "chana masala", 
      "chicken biryani", "chicken curry", "chicken korma", "chicken tikka masala",
      "dal makhani", "dal tadka", "fish curry", "gobi paratha", "idli",
      "kadhi", "keema", "khichdi", "kofta", "korma", "ladoo", "malai kofta",
      "mutton curry", "naan", "palak paneer", "paneer butter masala", "paneer tikka",
      "paneer", "paratha", "pulao", "rajma", "rasam", "roti", "samosa",
      "sambar", "tandoori chicken", "tikka", "upma", "vada", "veg biryani"
    ];
    
    // Combine and return unique dish names
    return [...new Set([...knownDishes, ...commonDishes])];
  }
  
  /**
   * Check if a dish name is valid and known
   * @param {string} dishName - The dish name to validate
   * @returns {boolean} - Whether the dish is valid and known
   */
  isValidKnownDish(dishName) {
    if (!dishName || typeof dishName !== 'string') {
      return false;
    }
    
    const normalizedName = dishName.toLowerCase().trim();
    
    // Check if it's in our known dishes list
    return this.knownDishes.some(dish => 
      dish.includes(normalizedName) || normalizedName.includes(dish)
    );
  }

  /**
   * Validate a dish name using LLM
   * @param {string} dishName - The dish name to validate
   * @returns {Promise<{isValid: boolean, message: string, suggestedName: string|null}>} - Validation result
   */
  async validateDishNameWithLLM(dishName) {
    if (!this.useAiSdk) {
      // If no AI SDK, fall back to basic validation
      return {
        isValid: this.isValidKnownDish(dishName),
        message: this.isValidKnownDish(dishName) ? 
          "Dish name is valid" : 
          "This may not be a valid Indian dish name",
        suggestedName: null
      };
    }

    try {
      const prompt = `Is "${dishName}" a valid Indian dish name? Please respond with a JSON object containing:
      1. "isValid": boolean - whether this is a valid Indian dish name
      2. "message": string - explanation of why it's valid or invalid
      3. "suggestedName": string - if invalid, suggest the closest valid Indian dish name, or null if no suggestion
      
      Consider:
      - Must be a real Indian dish
      - Check for typos or misspellings
      - Consider regional variations of dish names
      - Must be a complete dish name, not just an ingredient
      - Random strings or non-dish names should be marked as invalid`;

      const { text } = await generateText({
        model: this.aiModel,
        prompt,
        temperature: 0.1 // Low temperature for more consistent results
      });

      try {
        const result = JSON.parse(text);
        return {
          isValid: result.isValid,
          message: result.message,
          suggestedName: result.suggestedName
        };
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        return {
          isValid: false,
          message: "Could not validate dish name",
          suggestedName: null
        };
      }
    } catch (error) {
      console.error("Error in LLM validation:", error);
      return {
        isValid: false,
        message: "Error validating dish name",
        suggestedName: null
      };
    }
  }

  /**
   * Fetch a recipe for a given dish name
   * @param {string} dishName - The name of the dish
   * @returns {Promise<Object>} - The recipe object
   */
  async fetchRecipe(dishName) {
    try {
      // Basic validation
      if (!dishName || typeof dishName !== 'string' || dishName.trim().length < 3) {
        console.log(`Invalid dish name: "${dishName}"`);
        return null;
      }

      const normalizedDishName = dishName.toLowerCase().trim();

      // First validate the dish name using LLM
      const validation = await this.validateDishNameWithLLM(normalizedDishName);
      if (!validation.isValid) {
        console.log(`Invalid dish name: "${dishName}". ${validation.message}`);
        if (validation.suggestedName) {
          console.log(`Did you mean: "${validation.suggestedName}"?`);
        }
        return null;
      }

      // If the LLM suggested a different name, use that
      const dishNameToUse = validation.suggestedName || normalizedDishName;

      // First check if we have the recipe in our dummy data
      if (this.dummyRecipes[dishNameToUse]) {
        console.log(`Found recipe for "${dishNameToUse}" in dummy data`);
        return this.dummyRecipes[dishNameToUse];
      }

      // If we have AI SDK configured, try to get the recipe from there
      if (this.useAiSdk) {
        console.log(
          `Fetching recipe for "${dishNameToUse}" using AI SDK with Google Gemini`
        );
        const recipe = await this.fetchFromAiSdk(dishNameToUse);
        
        // Double-check that the recipe is valid
        if (!recipe || !recipe.name || !recipe.ingredients || recipe.ingredients.length === 0) {
          console.log(`Invalid recipe returned for "${dishNameToUse}"`);
          return null;
        }
        
        return recipe;
      }

      // If all else fails, return null
      console.log(`Could not find recipe for "${dishNameToUse}"`);
      return null;
    } catch (error) {
      console.error(`Error fetching recipe for "${dishName}":`, error);
      return null;
    }
  }

  /**
   * Fetch a recipe using AI SDK with Google Gemini
   * @param {string} dishName - The name of the dish
   * @returns {Promise<Object>} - The recipe object
   */
  async fetchFromAiSdk(dishName) {
    try {
      // First, explicitly validate the dish name with a separate prompt
      const validationPrompt = `Is "${dishName}" a valid Indian dish name? 
      Respond with ONLY a JSON object in this exact format:
      {
        "isValid": true/false,
        "message": "explanation",
        "suggestedName": "correct name or null"
      }
      
      Rules:
      - Must be a real Indian dish that exists
      - Random strings or non-dish names are NOT valid
      - Must be a complete dish name, not just an ingredient
      - If invalid, suggest the closest valid Indian dish name
      - If valid, set suggestedName to null`;

      const { text: validationText } = await generateText({
        model: this.aiModel,
        prompt: validationPrompt,
        temperature: 0.1
      });

      let validationResult;
      try {
        validationResult = JSON.parse(validationText);
      } catch (parseError) {
        console.error("Error parsing validation response:", parseError);
        return null;
      }

      // If the dish name is invalid, return null
      if (!validationResult.isValid) {
        console.log(`Invalid dish name: "${dishName}". ${validationResult.message}`);
        return null;
      }

      // Use the suggested name if available
      const dishNameToUse = validationResult.suggestedName || dishName;

      // Define the schema for our recipe object
      const recipeSchema = z.object({
        name: z.string().describe("The name of the dish"),
        type: z
          .enum([
            "Wet Sabzi",
            "Dry Sabzi",
            "Dal",
            "Rice",
            "Roti",
            "Non-Veg Curry",
          ])
          .describe("The type of the dish"),
        ingredients: z
          .array(
            z.object({
              name: z.string().describe("Ingredient name"),
              standardQuantity: z
                .string()
                .describe(
                  "Quantity in standard household measurements (e.g., cup, tablespoon)"
                ),
            })
          )
          .describe("List of ingredients with quantities"),
        totalWeight: z
          .number()
          .describe("Total weight of prepared dish in grams (approximately)"),
      });

      // Create model with optional API key and safety settings
      // Use the provided model instance if available, otherwise create one
      const model = this.aiModel || google("gemini-2.0-flash-lite", {
        apiKey: this.apiKey,
        safetySettings: [
          { 
            category: "HARM_CATEGORY_DANGEROUS_CONTENT", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE" 
          },
        ],
      });

      // Use the generateObject function to get structured data
      const { object } = await generateObject({
        model,
        schema: recipeSchema,
        prompt: `You are a helpful assistant that knows a lot about Indian cooking. 
        I need you to provide a recipe for ${dishNameToUse}.
        
        Please provide the following information:
        1. The name of the dish
        2. The type of dish (Wet Sabzi, Dry Sabzi, Dal, Rice, Roti, Non-Veg Curry)
        3. A list of ingredients with quantities in standard household measurements (e.g., cup, tablespoon, teaspoon, etc.)
        4. Total weight of prepared dish in grams (approximately)
        
        The dish is typically prepared for 3-4 people.
        
        IMPORTANT: If ${dishNameToUse} is not a valid Indian dish name, return null or an empty object.`,
      });

      // Check if the recipe is valid
      if (!object || !object.name || !object.ingredients || object.ingredients.length === 0) {
        console.log(`No valid recipe returned for "${dishNameToUse}"`);
        return null;
      }

      return object;
    } catch (error) {
      console.error("Error in AI SDK call:", error);
      return null;
    }
  }

  /**
   * Get cooking instructions for a dish using AI SDK
   * @param {string} dishName - The name of the dish
   * @returns {Promise<string>} - Cooking instructions
   */
  async getCookingInstructions(dishName) {
    if (!this.useAiSdk) {
      return "Cooking instructions not available without AI SDK configured.";
    }

    try {
      // Use the provided model instance if available, otherwise create one
      const model = this.aiModel || google("gemini-2.0-flash-lite", {
        apiKey: this.apiKey,
        safetySettings: [
          { 
            category: "HARM_CATEGORY_DANGEROUS_CONTENT", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE" 
          },
        ],
      });

      const { text } = await generateText({
        model,
        prompt: `Write step-by-step cooking instructions for ${dishName}. 
                The instructions should be clear and concise, 
                appropriate for someone who has basic cooking knowledge.`,
      });

      return text;
    } catch (error) {
      console.error("Error getting cooking instructions:", error);
      return "Error retrieving cooking instructions.";
    }
  }
}

module.exports = RecipeFetcher;
