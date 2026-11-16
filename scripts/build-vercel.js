const { execSync } = require('node:child_process');

execSync('npm run build', {
  stdio: 'inherit',
  env: { ...process.env, REACT_APP_MAX_MEAL_PHOTO_MB: '4' },
});
