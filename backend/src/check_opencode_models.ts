import 'dotenv/config';

async function main() {
  try {
    const response = await fetch('https://opencode.ai/zen/v1/models');
    console.log(`Status: ${response.status}`);
    const data = await response.json() as any;
    console.log('Sample model object from OpenCode:');
    const firstModel = data.data?.[0] || data.models?.[0] || data?.[0];
    console.log(JSON.stringify(firstModel, null, 2));
    
    console.log('\nKeys in model object:');
    if (firstModel) {
      console.log(Object.keys(firstModel));
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main().catch(console.error);
