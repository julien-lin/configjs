import { Volume, createFsFromVolume } from 'memfs';

const vol = new Volume();
const fs = createFsFromVolume(vol);

// Test 1: Créer avec fromJSON
vol.fromJSON({
  '/': null,
  '/mock-project': null,
  '/mock-project/test.txt': 'hello'
});

console.log('Files after fromJSON:');
console.log(vol.toJSON());

// Test 2: Essayer mkdir
try {
  await fs.promises.mkdir('/mock-project/newdir', { recursive: true });
  console.log('\nmkdir /mock-project/newdir: SUCCESS');
} catch (error) {
  console.log('\nmkdir /mock-project/newdir: FAILED', error.message);
}

// Test 3: Vérifier le résultat
console.log('\nFiles after mkdir:');
console.log(vol.toJSON());
