const fs = require('fs');
const path = require('path');

class QuantityStandardizer {
  constructor() {
    this.householdMeasurements = require('../../data/householdMeasurements.json');
  }

  /**
   * Parse a quantity string into a standardized format
   * @param {string} quantityStr - The quantity string (e.g., "2 tablespoon")
   * @param {string} ingredientName - The name of the ingredient
   * @returns {Object} - Parsed quantity with value and unit
   */
  parseQuantity(quantityStr, ingredientName) {
    if (!quantityStr || typeof quantityStr !== 'string') {
      return { value: 0, unit: null };
    }

    // If quantity is already in grams, extract the number
    if (quantityStr.includes('g') && !quantityStr.includes('glass')) {
      const match = quantityStr.match(/(\d+(\.\d+)?)\s*g/);
      if (match) {
        return { value: parseFloat(match[1]), unit: 'g' };
      }
    }

    // Handle pounds (lb or pounds)
    if (quantityStr.includes('pound') || quantityStr.includes('lb')) {
        const match = quantityStr.match(/(\d+(\.\d+)?)\s*(pound|lb)s?/);
        if (match) {
            return { value: parseFloat(match[1]) * 453.592, unit: 'g' }; // Convert pounds to grams
        }
    }

    // If quantity is in ml, convert to grams (assuming density of 1g/ml for simplicity)
    if (quantityStr.includes('ml')) {
      const match = quantityStr.match(/(\d+(\.\d+)?)\s*ml/);
      if (match) {
        return { value: parseFloat(match[1]), unit: 'ml' };
      }
    }

    // Handle ranges like "2-3 tablespoon" by taking average
    if (quantityStr.includes('-')) {
      const parts = quantityStr.split('-');
      const val1 = parseFloat(parts[0].trim());
      const val2Match = parts[1].match(/(\d+(\.\d+)?)/);
      if (val2Match) {
        const val2 = parseFloat(val2Match[1]);
        const avg = (val1 + val2) / 2;
        const unitMatch = parts[1].match(/[a-zA-Z]+/);
        const unit = unitMatch ? unitMatch[0].trim().toLowerCase() : null;
        return { value: avg, unit };
      }
    }

    // Handle fractions like "1/2 cup"
    if (quantityStr.includes('/')) {
      const fractionMatch = quantityStr.match(/(\d+)\s*\/\s*(\d+)/);
      if (fractionMatch) {
        const numerator = parseInt(fractionMatch[1]);
        const denominator = parseInt(fractionMatch[2]);
        const decimal = numerator / denominator;
        
        // Extract unit after the fraction
        const unitMatch = quantityStr.match(/\/\s*\d+\s+([a-zA-Z]+)/);
        const unit = unitMatch ? unitMatch[1].trim().toLowerCase() : null;
        
        return { value: decimal, unit };
      }
    }

    // Handle decimal and unit format like "0.5 teaspoon"
    const generalMatch = quantityStr.match(/(\d+(\.\d+)?)\s+([a-zA-Z]+)/);
    if (generalMatch) {
      return {
        value: parseFloat(generalMatch[1]),
        unit: generalMatch[3].trim().toLowerCase()
      };
    }

    // Handle "to taste" or other non-numeric quantities
    if (quantityStr.toLowerCase().includes('to taste') || 
        quantityStr.toLowerCase().includes('as needed') ||
        quantityStr.toLowerCase().includes('as required')) {
      // Return a small default quantity
      return { value: 0.5, unit: 'teaspoon' };
    }

    // If we can't parse it, return default
    console.warn(`Could not parse quantity: ${quantityStr} for ${ingredientName}`);
    return { value: 0, unit: null };
  }

  /**
   * Convert a parsed quantity to grams
   * @param {Object} parsedQuantity - The parsed quantity object
   * @param {string} mappedIngredientName - The *mapped* ingredient name from the DB
   * @returns {number} - The quantity in grams
   */
  convertToGrams(parsedQuantity, mappedIngredientName) {
    const { value, unit } = parsedQuantity;
    
    // If already in grams, return as is
    if (unit === 'g') {
      return value;
    }
    
    // If in ml, assume 1g/ml for simplicity (not accurate for all ingredients)
    if (unit === 'ml') {
      return value;
    }
    
    // Convert using household measurements
    const normalizedIngredient = mappedIngredientName ? mappedIngredientName.toLowerCase().trim() : ''; // Use mapped name!
    
    // Check if ingredient has specific conversions (using mapped name)
    // Specific unit handlers first
    if (unit === 'piece') {
        if (this.householdMeasurements.measurements.piece && this.householdMeasurements.measurements.piece[normalizedIngredient]) {
             return value * this.householdMeasurements.measurements.piece[normalizedIngredient];
        }
        // Fallback to default piece weight if specific ingredient not found under 'piece'
        if (this.householdMeasurements.measurements.piece && this.householdMeasurements.measurements.piece.default) {
            return value * this.householdMeasurements.measurements.piece.default;
        }
    }

    if (unit === 'medium') { // Specifically handle 'medium'
        if (this.householdMeasurements.measurements.medium && this.householdMeasurements.measurements.medium[normalizedIngredient]) {
             return value * this.householdMeasurements.measurements.medium[normalizedIngredient];
        }
        // Fallback for 'medium' if specific ingredient not listed under 'medium'
        console.warn(`No specific 'medium' weight for ${normalizedIngredient}, using generic default.`);
        // Use a generic default or potentially the piece default?
        // Let's use a reasonable default guess for medium size item
        return value * 120; // e.g. 120g default for a 'medium' unknown item
    }
    
    // Check if ingredient is in a special category
    let category = null;
    if (this.householdMeasurements.ingredients[normalizedIngredient]) {
      category = this.householdMeasurements.ingredients[normalizedIngredient];
    }
    
    // If ingredient has a category and the category has a conversion for this unit
    if (category && 
        this.householdMeasurements.ingredientCategories[category] && 
        this.householdMeasurements.ingredientCategories[category][unit]) {
      return value * this.householdMeasurements.ingredientCategories[category][unit];
    }
    
    // Default to standard conversions if unit exists
    if (unit && this.householdMeasurements.measurements[unit]) {
      const unitData = this.householdMeasurements.measurements[unit];
      if (typeof unitData === 'object') {
        // Check for ingredient-specific within the unit object
        if (unitData[normalizedIngredient]) {
          return value * unitData[normalizedIngredient];
        }
        // Use default within the unit object if it exists
        if (unitData.default) {
            return value * unitData.default;
        }
        // Fallback if unit object exists but has no matching key or default (shouldn't happen with good config)
        console.warn(`No specific or default conversion found for unit object '${unit}', using 10`);
        return value * 10; 
      } else {
        // Simple numeric conversion for the unit
        return value * unitData;
      }
    }
    
    // If all else fails, make a reasonable guess
    console.warn(`No conversion found for ${value} ${unit} of ${mappedIngredientName}, using default`);
    
    const defaultConversions = {
      'cup': 150,
      'tablespoon': 15,
      'teaspoon': 5,
      'piece': 30,
      'clove': 5,
      'inch': 10,
      'handful': 30,
      'pinch': 0.5
    };
    
    return value * (defaultConversions[unit] || 10); // Default to 10g if unit unknown
  }

  /**
   * Standardize a household measurement to grams
   * @param {string} quantity - The quantity string
   * @param {string} mappedIngredientName - The *mapped* ingredient name from the DB
   * @returns {number} - The quantity in grams
   */
  standardizeToGrams(quantity, mappedIngredientName) {
    // Pass mapped name to parseQuantity for logging context if needed
    const parsedQuantity = this.parseQuantity(quantity, mappedIngredientName || 'unknown ingredient'); 
    return this.convertToGrams(parsedQuantity, mappedIngredientName);
  }
}

module.exports = QuantityStandardizer; 