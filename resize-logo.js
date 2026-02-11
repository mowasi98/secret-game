const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const sizes = [
    { name: 'logo.png', size: 32 },
    { name: 'logo-180.png', size: 180 },
    { name: 'logo-192.png', size: 192 },
    { name: 'logo-512.png', size: 512 }
];

async function resizeLogos() {
    try {
        // Try to find logo file
        let originalPath = path.join(__dirname, 'public', 'logo-original.png');
        if (!fs.existsSync(originalPath)) {
            originalPath = path.join(__dirname, 'public', 'logo.png');
        }
        
        if (!fs.existsSync(originalPath)) {
            console.error('❌ No logo file found in public folder!');
            console.log('Please save your logo image as: public/logo.png or public/logo-original.png');
            process.exit(1);
        }
        
        console.log(`📸 Using: ${path.basename(originalPath)}`);
        console.log('📸 Reading original logo...');
        
        const image = await Jimp.read(originalPath);

        for (const { name, size } of sizes) {
            console.log(`🔄 Creating ${name} (${size}x${size})...`);
            const resized = image.clone();
            resized.resize({ w: size, h: size });
            await resized.write(path.join(__dirname, 'public', name));
            console.log(`✅ Created ${name}`);
        }

        console.log('\n🎉 All logo sizes created successfully!');
        console.log('\n📁 Generated files:');
        sizes.forEach(s => console.log(`   - public/${s.name}`));
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

resizeLogos();
