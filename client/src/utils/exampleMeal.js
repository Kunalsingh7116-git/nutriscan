function option(label, name, grams, calories, protein, carbs, fat, fiber, sugar, sodium) {
  return { label, name, grams, calories, protein, carbs, fat, fiber, sugar, sodium };
}

export const exampleMeal = {
  status: 'ready',
  title: 'Chicken and quinoa bowl',
  foods: [
    { question: '', options: [option('Grilled chicken', 'Grilled chicken', 110, 182, 34, 0, 4, 0, 0, 170)] },
    {
      question: 'What’s the grain in the bowl?',
      options: [
        option('Quinoa', 'Cooked quinoa', 110, 132, 5, 23, 2, 3, 1, 8),
        option('Brown rice', 'Cooked brown rice', 110, 135, 3, 28, 1, 2, 0, 4),
        option('Couscous', 'Cooked couscous', 110, 123, 4, 25, 0.2, 2, 0, 6),
      ],
    },
    {
      question: 'How much avocado was on the plate?',
      options: [
        option('½ avocado', 'Avocado', 75, 120, 1.5, 6, 11, 5, 0.5, 5),
        option('¼ avocado', 'Avocado', 38, 61, 0.8, 3, 5.5, 2.5, 0.3, 3),
        option('1 whole avocado', 'Avocado', 150, 240, 3, 12, 22, 10, 1, 10),
      ],
    },
    { question: '', options: [option('Chickpeas', 'Chickpeas', 55, 90, 5, 15, 1.5, 4, 2.6, 10)] },
    { question: '', options: [option('Mixed vegetables', 'Cucumber, tomatoes and greens', 90, 19, 1, 3.5, 0.3, 1.4, 2.5, 14)] },
  ],
};
