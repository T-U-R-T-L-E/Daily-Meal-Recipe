import { Recipe } from '../types';

export interface WarningInfo {
  type: 'diet' | 'illness' | 'allergy';
  tag: string;
  message: string;
  severity: 'warning' | 'critical';
}

export function getRecipeWarnings(
  recipe: Recipe, 
  activeTags: string[], 
  userProfile?: {
    dietaryPreferences?: string[];
    allergies?: string[];
    healthConditions?: string[];
  } | null
): WarningInfo[] {
  const warnings: WarningInfo[] = [];
  const ingredientsLower = (recipe.ingredients || []).map(ing => (ing.item || '').toLowerCase());
  const recipeNameLower = (recipe.name || '').toLowerCase();
  const recipeDescLower = (recipe.description || '').toLowerCase();
  const recipeDietaryTags = (recipe.dietaryTags || []).map(t => t.toLowerCase());

  // Aggregate tags from search and from user profile
  const checkedPreferences = new Set<string>();
  const checkedConditions = new Set<string>();
  const checkedAllergies = new Set<string>();

  // Extract from active search tags
  activeTags.forEach(tag => {
    const lTag = tag.toLowerCase();
    if (['vegan', 'vegetarian', 'dairy-free', 'gluten-free', 'keto', 'paleo', 'dairy-free'].includes(lTag)) {
      checkedPreferences.add(tag);
    } else if (['diabetic', 'hypertension', 'celiac', 'lactose intolerant'].includes(lTag)) {
      checkedConditions.add(tag);
    } else if (['nuts', 'peanuts', 'dairy', 'soy', 'shellfish', 'eggs'].includes(lTag)) {
      checkedAllergies.add(tag);
    }
  });

  // Extract from user profile
  if (userProfile) {
    (userProfile.dietaryPreferences || []).forEach(p => checkedPreferences.add(p));
    (userProfile.healthConditions || []).forEach(hc => checkedConditions.add(hc));
    (userProfile.allergies || []).forEach(a => checkedAllergies.add(a));
  }

  // --- 1. Diabetic / Sugar Check ---
  const isDiabeticChecked = checkedConditions.has('Diabetic') || 
    Array.from(checkedPreferences).some(p => p.toLowerCase().includes('sugar') || p.toLowerCase() === 'diabetic');
  if (isDiabeticChecked) {
    const hasHighSugarInNutrition = recipe.nutrition?.sugar && recipe.nutrition.sugar > 10;
    const hasHighCarbsInNutrition = recipe.nutrition?.carbs && recipe.nutrition.carbs > 40;
    const hasSugarIngredients = ingredientsLower.some(ing => 
      ing.includes('sugar') || ing.includes('honey') || ing.includes('syrup') || ing.includes('nectar') || ing.includes('candy')
    );
    if (hasHighSugarInNutrition || hasSugarIngredients || hasHighCarbsInNutrition) {
      warnings.push({
        type: 'illness',
        tag: 'Diabetic-friendly',
        message: `Diabetes Warning: High sugar (${recipe.nutrition?.sugar || '?'}g) or sweeteners detected in food profile. May spike blood glucose.`,
        severity: 'critical'
      });
    }
  }

  // --- 2. Celiac / Gluten-Free Check ---
  const isCeliacChecked = checkedConditions.has('Celiac') || 
    checkedPreferences.has('Gluten-Free') || 
    Array.from(checkedPreferences).some(p => p.toLowerCase().includes('gluten'));
  if (isCeliacChecked) {
    const isTaggedGlutenFree = recipeDietaryTags.includes('gluten-free') || recipeDietaryTags.some(t => t.includes('gluten'));
    const hasGlutenIngredients = ingredientsLower.some(ing => 
      ing.includes('flour') || ing.includes('wheat') || ing.includes('barley') || ing.includes('rye') || ing.includes('bread') || ing.includes('pasta') || ing.includes('soy sauce') || ing.includes('semolina') || ing.includes('ramen')
    );
    if (!isTaggedGlutenFree && hasGlutenIngredients) {
      warnings.push({
        type: 'illness',
        tag: 'Gluten-Free / Celiac',
        message: 'Gluten Warning: Potential gluten sources detected (e.g., wheat, flour, bread, soy sauce). Avoid if Celiac.',
        severity: 'critical'
      });
    }
  }

  // --- 3. Hypertension / High Blood Pressure / Low-Sodium Check ---
  const isHypertensionChecked = checkedConditions.has('Hypertension') || 
    Array.from(checkedPreferences).some(p => p.toLowerCase().includes('sodium') || p.toLowerCase() === 'hypertension');
  if (isHypertensionChecked) {
    const isHighSodium = recipe.nutrition?.sodium && recipe.nutrition.sodium > 500;
    const hasSaltyIngredients = ingredientsLower.some(ing => 
      ing.includes('salt') || ing.includes('soy sauce') || ing.includes('bouillon') || ing.includes('bacon') || ing.includes('parmesan')
    );
    if (isHighSodium || hasSaltyIngredients) {
      warnings.push({
        type: 'illness',
        tag: 'Hypertension-friendly',
        message: `Sodium Warning: High sodium level (${recipe.nutrition?.sodium || '?'}mg) or salt additives parsed. Care recommended for Hypertension.`,
        severity: 'critical'
      });
    }
  }

  // --- 4. Lactose Intolerant / Dairy-Free Check ---
  const isLactoseChecked = checkedConditions.has('Lactose Intolerant') || 
    checkedPreferences.has('Dairy-Free') || 
    Array.from(checkedPreferences).some(p => p.toLowerCase().includes('dairy') || p.toLowerCase() === 'lactose') || 
    checkedAllergies.has('Dairy');
  if (isLactoseChecked) {
    const isTaggedDairyFree = recipeDietaryTags.includes('dairy-free') || recipeDietaryTags.includes('vegan');
    const hasDairyIngredients = ingredientsLower.some(ing => 
      ing.includes('milk') || ing.includes('cheese') || ing.includes('butter') || ing.includes('cream') || ing.includes('yogurt') || ing.includes('ghee') || ing.includes('whey')
    );
    if (!isTaggedDairyFree && hasDairyIngredients) {
      warnings.push({
        type: 'illness',
        tag: 'Lactose / Dairy-Free',
        message: 'Dairy Warning: Dairy elements detected (milk, cheese, butter, cream). Pose lactose allergy risk.',
        severity: 'critical'
      });
    }
  }

  // --- 5. Vegan / Vegetarian Check ---
  const isVeganChecked = checkedPreferences.has('Vegan') || Array.from(checkedPreferences).some(p => p.toLowerCase() === 'vegan');
  const isVegetarianChecked = checkedPreferences.has('Vegetarian') || 
    Array.from(checkedPreferences).some(p => p.toLowerCase() === 'vegetarian') || isVeganChecked;

  if (isVegetarianChecked) {
    const isTaggedVeg = recipeDietaryTags.includes('vegetarian') || recipeDietaryTags.includes('vegan');
    const hasMeatIngredients = ingredientsLower.some(ing => 
      ing.includes('chicken') || ing.includes('beef') || ing.includes('pork') || ing.includes('bacon') || ing.includes('steak') || ing.includes('fish') || ing.includes('shrimp') || ing.includes('salmon') || ing.includes('tuna') || ing.includes('meat') || ing.includes('poultry') || ing.includes('prawn') || ing.includes('turkey') || ing.includes('lamb')
    );
    
    if (isVeganChecked) {
      const isTaggedVegan = recipeDietaryTags.includes('vegan');
      const hasNonVeganIngredients = hasMeatIngredients || ingredientsLower.some(ing => 
        ing.includes('egg') || ing.includes('cheese') || ing.includes('butter') || ing.includes('cream') || ing.includes('milk') || ing.includes('honey') || ing.includes('mayo')
      );
      if (!isTaggedVegan && hasNonVeganIngredients) {
        warnings.push({
          type: 'diet',
          tag: 'Vegan',
          message: 'Vegan Warning: Animal products detected (meat, egg, dairy, etc.). Violates Vegan requirements.',
          severity: 'warning'
        });
      }
    } else if (!isTaggedVeg && hasMeatIngredients) {
      warnings.push({
        type: 'diet',
        tag: 'Vegetarian',
        message: 'Vegetarian Warning: Meat/seafood ingredients detected. Violates Vegetarian requirements.',
        severity: 'warning'
      });
    }
  }

  // --- 6. Nut Allergy check ---
  const isNutAllergyChecked = checkedAllergies.has('Nuts') || 
    checkedAllergies.has('Peanuts') || 
    Array.from(checkedAllergies).some(a => a.toLowerCase().includes('nut')) ||
    Array.from(checkedPreferences).some(p => p.toLowerCase().includes('nut'));
  if (isNutAllergyChecked) {
    const hasNuts = ingredientsLower.some(ing => 
      ing.includes('nut') || ing.includes('almond') || ing.includes('walnut') || ing.includes('cashew') || ing.includes('pecan') || ing.includes('pesto')
    );
    if (hasNuts) {
      warnings.push({
        type: 'allergy',
        tag: 'Nuts Allergen',
        message: 'Allergen Warning: Nut parts detected (snack nut, pesto, peanut butter, oil). High risk for Nut allergies.',
        severity: 'critical'
      });
    }
  }

  return warnings;
}
