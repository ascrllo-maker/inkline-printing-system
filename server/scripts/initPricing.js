import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pricing from '../models/Pricing.js';

dotenv.config();

// Default pricing (can be adjusted)
const defaultPricing = [
  // IT Shop Pricing
  { shop: 'IT', paperSize: 'A4', colorType: 'Black and White', pricePerCopy: 2.00 },
  { shop: 'IT', paperSize: 'A4', colorType: 'Colored', pricePerCopy: 5.00 },
  { shop: 'IT', paperSize: 'Letter', colorType: 'Black and White', pricePerCopy: 2.00 },
  { shop: 'IT', paperSize: 'Letter', colorType: 'Colored', pricePerCopy: 5.00 },
  { shop: 'IT', paperSize: 'Legal', colorType: 'Black and White', pricePerCopy: 2.50 },
  { shop: 'IT', paperSize: 'Legal', colorType: 'Colored', pricePerCopy: 6.00 },
  { shop: 'IT', paperSize: 'Long', colorType: 'Black and White', pricePerCopy: 3.00 },
  { shop: 'IT', paperSize: 'Long', colorType: 'Colored', pricePerCopy: 7.00 },
  
  // SSC Shop Pricing
  { shop: 'SSC', paperSize: 'A4', colorType: 'Black and White', pricePerCopy: 2.00 },
  { shop: 'SSC', paperSize: 'A4', colorType: 'Colored', pricePerCopy: 5.00 },
  { shop: 'SSC', paperSize: 'Letter', colorType: 'Black and White', pricePerCopy: 2.00 },
  { shop: 'SSC', paperSize: 'Letter', colorType: 'Colored', pricePerCopy: 5.00 },
  { shop: 'SSC', paperSize: 'Legal', colorType: 'Black and White', pricePerCopy: 2.50 },
  { shop: 'SSC', paperSize: 'Legal', colorType: 'Colored', pricePerCopy: 6.00 },
  { shop: 'SSC', paperSize: 'Long', colorType: 'Black and White', pricePerCopy: 3.00 },
  { shop: 'SSC', paperSize: 'Long', colorType: 'Colored', pricePerCopy: 7.00 },
];

async function initPricing() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Initializing pricing data...');
    
    // Use bulk write to insert or update pricing
    const bulkOps = defaultPricing.map(item => ({
      updateOne: {
        filter: {
          shop: item.shop,
          paperSize: item.paperSize,
          colorType: item.colorType
        },
        update: {
          $set: {
            pricePerCopy: item.pricePerCopy,
            updatedAt: new Date()
          },
          $setOnInsert: {
            shop: item.shop,
            paperSize: item.paperSize,
            colorType: item.colorType
          }
        },
        upsert: true
      }
    }));

    const result = await Pricing.bulkWrite(bulkOps);
    console.log('✅ Pricing initialized successfully');
    console.log(`   - Inserted: ${result.upsertedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);
    console.log(`   - Matched: ${result.matchedCount}`);

    // Display all pricing
    const allPricing = await Pricing.find().lean().sort({ shop: 1, paperSize: 1, colorType: 1 });
    console.log('\n📊 Current Pricing:');
    allPricing.forEach(p => {
      console.log(`   ${p.shop} - ${p.paperSize} - ${p.colorType}: ₱${p.pricePerCopy.toFixed(2)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing pricing:', error);
    process.exit(1);
  }
}

initPricing();

