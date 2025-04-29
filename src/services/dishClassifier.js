class DishClassifier {
  constructor() {
    this.dishTypes = {
      MAIN_COURSE: 'main_course',
      SIDE_DISH: 'side_dish',
      DESSERT: 'dessert',
      BEVERAGE: 'beverage',
      SNACK: 'snack',
      APPETIZER: 'appetizer'
    };
    
    // Common keywords for each dish type
    this.typeKeywords = {
      [this.dishTypes.MAIN_COURSE]: ['curry', 'rice', 'biryani', 'pulao', 'roti', 'naan', 'paratha', 'dal', 'sabzi', 'korma', 'masala'],
      [this.dishTypes.SIDE_DISH]: ['raita', 'chutney', 'pickle', 'papad', 'salad'],
      [this.dishTypes.DESSERT]: ['kheer', 'gulab jamun', 'rasgulla', 'jalebi', 'ladoo', 'barfi', 'halwa'],
      [this.dishTypes.BEVERAGE]: ['lassi', 'chai', 'buttermilk', 'sharbat', 'thandai'],
      [this.dishTypes.SNACK]: ['samosa', 'pakora', 'vada', 'bhel', 'chaat', 'kachori'],
      [this.dishTypes.APPETIZER]: ['soup', 'shorba', 'tikka', 'kebab']
    };
  }

  /**
   * Validates if a dish name is valid
   * @param {string} dishName - The name of the dish to validate
   * @returns {boolean} - Whether the dish name is valid
   */
  isValidDishName(dishName) {
    if (!dishName || typeof dishName !== 'string') {
      return false;
    }
    
    const trimmedName = dishName.trim();
    if (trimmedName.length < 3) {
      return false;
    }
    
    // Check if the name contains at least one letter
    if (!/[a-zA-Z]/.test(trimmedName)) {
      return false;
    }
    
    // Allow letters, spaces, hyphens, and basic punctuation
    const validNameRegex = /^[a-zA-Z\s\-.,'()]+$/;
    return validNameRegex.test(trimmedName);
  }

  /**
   * Classify a dish based on its name
   * @param {string} dishName - The name of the dish
   * @returns {string} - The type of dish
   */
  classifyDish(dishName) {
    if (!this.isValidDishName(dishName)) {
      return this.dishTypes.MAIN_COURSE; // Default to main course if invalid
    }

    const normalizedName = dishName.toLowerCase().trim();
    
    // Check each dish type's keywords
    for (const [type, keywords] of Object.entries(this.typeKeywords)) {
      if (keywords.some(keyword => normalizedName.includes(keyword))) {
        return type;
      }
    }
    
    // Default to main course if no specific type is identified
    return this.dishTypes.MAIN_COURSE;
  }

  /**
   * Validate and correct dish type if needed
   * @param {string} dishType - The predicted dish type
   * @param {Array} ingredients - List of ingredients
   * @returns {string} - The validated dish type
   */
  validateDishType(dishType, ingredients) {
    // If no dish type provided, return default
    if (!dishType) {
      return this.dishTypes.MAIN_COURSE;
    }
    
    // If ingredients list is empty, return the provided dish type
    if (!ingredients || ingredients.length === 0) {
      return dishType;
    }
    
    // Check if ingredients match the dish type
    const ingredientNames = ingredients.map(i => i.name.toLowerCase());
    
    // Special validation for desserts
    if (dishType === this.dishTypes.DESSERT) {
      const dessertKeywords = ['sugar', 'ghee', 'milk', 'khoya', 'cardamom'];
      if (!ingredientNames.some(name => dessertKeywords.some(keyword => name.includes(keyword)))) {
        return this.dishTypes.MAIN_COURSE;
      }
    }
    
    // Special validation for beverages
    if (dishType === this.dishTypes.BEVERAGE) {
      const beverageKeywords = ['water', 'milk', 'yogurt', 'tea', 'spice'];
      if (!ingredientNames.some(name => beverageKeywords.some(keyword => name.includes(keyword)))) {
        return this.dishTypes.MAIN_COURSE;
      }
    }
    
    return dishType;
  }
}

module.exports = DishClassifier; 