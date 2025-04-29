const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { generateText } = require('ai'); // Import generateText

// List of descriptive words/phrases to remove during preprocessing
const wordsToRemove = [
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'cubed', 'pureed',
  'finely', 'roughly', 'cut into', 'cubes', 'paste',
  'fresh', 'dried', 'powder', 'whole', 'leaves', 'seeds',
  'boneless', 'skinless', 'plain',
  'for garnish', 'to taste', 'as needed', 'as required',
  'medium', 'large', 'small',
  '1-inch', 'pieces'
];

// Regex to match quantities/units at the beginning or end of descriptions
const quantityRegex = /^(\d+(\.\d+)?\s*\/?\d*\s*(cup|tablespoon|teaspoon|tsp|tbsp|g|kg|ml|l|pound|lb|oz|katori|glass)s?\b)|\b(\d+(\.\d+)?\s*\/?\d*\s*(cup|tablespoon|teaspoon|tsp|tbsp|g|kg|ml|l|pound|lb|oz|katori|glass)s?)$/i;

class IngredientMapper {
  constructor(aiModel) { // Accept AI model instance
    this.aiModel = aiModel; // Store the model instance
    this.nutritionDB = [];
    this.dbIngredientNames = []; // Cache DB names for AI prompt
    
    // Try to load custom synonyms if available
    try {
      const synonymsPath = path.resolve(__dirname, '../../data/ingredientSynonyms.json');
      if (fs.existsSync(synonymsPath)) {
        this.ingredientSynonyms = require(synonymsPath);
        console.log(`Loaded ${Object.keys(this.ingredientSynonyms).length} ingredient synonyms`);
      } else {
        // Fall back to basic synonyms if file doesn't exist
        this.ingredientSynonyms = this.getDefaultSynonyms();
        console.log('Using default ingredient synonyms');
      }
    } catch (error) {
      console.error('Error loading ingredient synonyms:', error);
      this.ingredientSynonyms = this.getDefaultSynonyms();
    }
    
    // Load the nutrition database immediately and synchronously
    this.loadNutritionDBSync();
  }

  /**
   * Get default synonyms for common ingredients
   * @returns {Object} - Map of ingredient synonyms
   */
  getDefaultSynonyms() {
    return {
      // Common ingredient variations and synonyms
      'onions': 'onion',
      'tomatoes': 'tomato',
      'ginger paste': 'ginger',
      'garlic paste': 'garlic',
      'ginger garlic paste': 'garlic', // Approximate as garlic for simplicity
      'chopped tomato': 'tomato',
      'chopped onion': 'onion',
      'potatoes': 'potato',
      'cashews': 'cashew',
      'yoghurt': 'yogurt',
      'dahi': 'yogurt',
      'whole wheat flour': 'wheat_flour',
      'atta': 'wheat_flour',
      'maida': 'wheat_flour',
      'red chili': 'red_chili_powder',
      'lal mirch': 'red_chili_powder',
      'haldi': 'turmeric_powder',
      'jeera': 'cumin_seeds',
      'dhaniya powder': 'coriander_powder',
      'dhania powder': 'coriander_powder',
      'dhania': 'coriander_leaves',
      'coriander': 'coriander_leaves',
      'pudina': 'mint_leaves',
      'green peas': 'green_peas',
      'matar': 'green_peas',
      'aloo': 'potato',
      'gobi': 'cauliflower',
      'palak': 'spinach',
      'moong dal': 'moong_dal',
      'toor dal': 'toor_dal',
      'arhar dal': 'toor_dal',
      'chana dal': 'chana_dal'
    };
  }

  /**
   * Load the nutrition database from CSV synchronously
   */
  loadNutritionDBSync() {
    try {
      // Load the processed nutrition database
      const processedFilePath = path.resolve(__dirname, '../../data/processedNutritionDB.csv');
      
      if (!fs.existsSync(processedFilePath)) {
        console.error('Processed nutrition database file not found!');
        this.nutritionDB = [];
        return;
      }
      
      const fileContent = fs.readFileSync(processedFilePath, 'utf8');
      
      // Simple CSV parsing without csv-parser
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        const row = {};
        
        for (let j = 0; j < headers.length; j++) {
          row[headers[j].trim()] = values[j] ? values[j].trim() : '';
        }
        
        this.nutritionDB.push(row);
      }
      
      console.log(`Loaded ${this.nutritionDB.length} ingredients from comprehensive nutrition database`);

      // Cache the ingredient names for AI prompts
      this.dbIngredientNames = this.nutritionDB.map(item => item.ingredient);

    } catch (error) {
      console.error('Error loading nutrition database:', error);
      // Initialize with an empty array to avoid null errors
      this.nutritionDB = [];
    }
  }

  /**
   * Load the nutrition database from CSV (async version)
   */
  loadNutritionDB() {
    const results = [];
    const processedFilePath = path.resolve(__dirname, '../../data/processedNutritionDB.csv');
    
    if (!fs.existsSync(processedFilePath)) {
      console.error('Processed nutrition database file not found!');
      this.nutritionDB = [];
      return Promise.reject(new Error('Processed nutrition database file not found!'));
    }
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(processedFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.nutritionDB = results;
          console.log(`Loaded ${results.length} ingredients from comprehensive nutrition database`);
          resolve(results);
        })
        .on('error', (error) => {
          console.error('Error loading nutrition database:', error);
          reject(error);
        });
    });
  }

  /**
   * Preprocess the ingredient name from AI to clean it for mapping
   * @param {string} rawName - The raw ingredient name from the AI
   * @returns {string} - The cleaned ingredient name
   */
  preprocessIngredientName(rawName) {
    if (!rawName) return '';

    let cleanedName = rawName.toLowerCase().trim();

    // Remove quantities and units that might be embedded in the name itself
    cleanedName = cleanedName.replace(quantityRegex, '').trim();

    // Remove specific descriptive words/phrases
    wordsToRemove.forEach(word => {
      // Remove whole word occurrences
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedName = cleanedName.replace(regex, '');
    });

    // Remove extra punctuation (commas, parentheses, etc.) often added by AI
    cleanedName = cleanedName.replace(/[(),:]/g, '');

    // Replace multiple spaces with a single space
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    // Handle specific cases like ginger-garlic -> check synonym
    if (cleanedName === 'ginger-garlic') {
      return 'ginger-garlic paste'; // Let synonym mapping handle this
    }
    
    // If cleaning resulted in an empty string, return original for synonym check
    return cleanedName || rawName.toLowerCase().trim(); 
  }

  /**
   * Map an ingredient name to the standardized name in the nutrition database
   * @param {string} ingredientName - The raw ingredient name
   * @returns {Promise<string|null>} - The standardized ingredient name
   */
  async standardizeIngredientName(ingredientName) {
    if (!ingredientName) return null;
    
    const originalNameForAI = ingredientName; // Keep original for AI helper
    const cleanedName = this.preprocessIngredientName(ingredientName);
    
    const normalized = cleanedName.trim(); // Already lowercase
    if (!normalized) return null; 
    
    const normalizedWithUnderscores = normalized.replace(/\s+/g, '_');
    
    // Direct match with underscores
    if (this.findInNutritionDB(normalizedWithUnderscores)) {
      return normalizedWithUnderscores;
    }
    
    // Direct match without underscores
    if (this.findInNutritionDB(normalized)) {
      return normalized;
    }
    
    // Check synonyms
    if (this.ingredientSynonyms[normalized]) {
      const synonymTarget = this.ingredientSynonyms[normalized];
      if (this.findInNutritionDB(synonymTarget)) {
          return synonymTarget;
      }
    }
    
    // Try to find closest match by prioritizing exact or simpler forms
    const potentialMatches = this.findAllInNutritionDB(normalized);
    if (potentialMatches.length > 0) {
        const exactMatch = potentialMatches.find(item => item.ingredient === normalized || item.ingredient === normalizedWithUnderscores);
        if (exactMatch) {
            return exactMatch.ingredient;
        }
        
        // Prioritize basic 'onion' or 'tomato' etc. if multiple matches
        const baseMatch = potentialMatches.find(item => item.ingredient === normalized.replace(/s$/, '') || item.ingredient === normalizedWithUnderscores.replace(/_s$/, ''));
        if (baseMatch) {
            console.warn(`Multiple potential matches for "${originalNameForAI}" (cleaned to "${normalized}"). Prioritizing base form: ${baseMatch.ingredient}`);
            return baseMatch.ingredient;
        }

        // Fallback: prioritize shorter, potentially more generic names
        potentialMatches.sort((a, b) => a.ingredient.length - b.ingredient.length);
        console.warn(`Multiple potential matches for "${originalNameForAI}" (cleaned to "${normalized}"). Using shortest match as best guess: ${potentialMatches[0].ingredient}`);
        return potentialMatches[0].ingredient; 
    }
    
    // AI Assistance Fallback
    const aiMatch = await this.getAiAssistedMatch(originalNameForAI);
    if (aiMatch) {
      return aiMatch;
    }
    
    // No match found
    console.warn(`No match found for ingredient (even with AI): ${originalNameForAI}`);
    return null;
  }

  /**
   * Find ALL ingredients containing the search term in the nutrition database
   * @param {string} ingredientName - The ingredient name part to find
   * @returns {Array<Object>} - Array of matching nutrition data objects
   */
  findAllInNutritionDB(ingredientName) {
    if (!this.nutritionDB || this.nutritionDB.length === 0 || !ingredientName) {
      return [];
    }
    const searchTerm = ingredientName.toLowerCase();
    // Also check with underscores
    const searchTermUnderscore = searchTerm.replace(/\s+/g, '_');

    return this.nutritionDB.filter(item => 
        item.ingredient.includes(searchTerm) || 
        item.ingredient.includes(searchTermUnderscore)
    );
  }

  /**
   * Find a partial match for an ingredient in the nutrition database
   * @param {string} ingredientName - The ingredient name to find
   * @returns {string|null} - The matched ingredient name or null
   */
  findPartialMatch(ingredientName) {
    if (!this.nutritionDB || this.nutritionDB.length === 0) {
      return null;
    }
    
    // Try to find an ingredient that contains our search term
    const match = this.nutritionDB.find(item => 
      item.ingredient.includes(ingredientName) || 
      ingredientName.includes(item.ingredient)
    );
    
    return match ? match.ingredient : null;
  }

  /**
   * Find an ingredient in the nutrition database
   * @param {string} ingredientName - The ingredient name to find
   * @returns {Object|null} - The nutrition data for the ingredient
   */
  findInNutritionDB(ingredientName) {
    if (!this.nutritionDB || this.nutritionDB.length === 0) {
      // Return empty object instead of throwing error
      console.warn('Nutrition database not loaded or empty');
      return null;
    }
    
    return this.nutritionDB.find(item => item.ingredient === ingredientName);
  }

  /**
   * Get nutrition data for an ingredient
   * @param {string} ingredientName - The ingredient name
   * @returns {Promise<Object|null>} - The nutrition data for the ingredient
   */
  async getNutritionData(ingredientName) {
    const standardName = await this.standardizeIngredientName(ingredientName);
    if (!standardName) {
      // Log here as the standardize function already warned
      console.log(`No nutrition data found for ${ingredientName} (mapping failed).`);
      return null;
    }
    
    const nutritionData = this.findInNutritionDB(standardName);
    if (!nutritionData) {
         console.warn(`Mapped name "${standardName}" not found in DB unexpectedly for original: ${ingredientName}`);
         return null;
    }
    return nutritionData;
  }

  /**
   * Get AI assistance to map an ingredient name.
   * @param {string} originalIngredientName - The original, unprocessed name from the AI.
   * @returns {Promise<string|null>} - The best matching standardized name from DB or null.
   */
  async getAiAssistedMatch(originalIngredientName) {
    if (!this.aiModel || !originalIngredientName || this.dbIngredientNames.length === 0) {
      return null;
    }

    // Simple keyword pre-filtering (optional, improves prompt efficiency)
    const keywords = originalIngredientName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let candidateNames = this.dbIngredientNames.filter(dbName => 
        keywords.some(kw => dbName.includes(kw))
    );
    // Limit candidates to avoid overly long prompts
    if (candidateNames.length === 0 || candidateNames.length > 100) { 
        candidateNames = this.dbIngredientNames.slice(0, 100); // Fallback or limit
    }

    const prompt = `Given the ingredient phrase: "${originalIngredientName}" and the following possible standardized ingredient names from my database: ${candidateNames.join(', ')}. Which database name is the BEST match? Respond with ONLY the best matching name from the list, or "None" if no good match exists.`;

    try {
      console.log(`Requesting AI assistance for mapping: "${originalIngredientName}"`);
      const { text } = await generateText({
        model: this.aiModel,
        prompt: prompt,
        maxTokens: 50, // Keep response short
      });

      const bestMatch = text.trim();

      // Validate the AI's response
      if (bestMatch && bestMatch !== 'None' && this.dbIngredientNames.includes(bestMatch)) {
        console.log(`AI suggested match: "${originalIngredientName}" -> "${bestMatch}"`);
        return bestMatch;
      } else {
        console.warn(`AI could not provide a valid match for "${originalIngredientName}". Response: "${bestMatch}"`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting AI-assisted match for "${originalIngredientName}":`, error);
      return null;
    }
  }
}

module.exports = IngredientMapper; 