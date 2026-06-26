const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanatory_crm').then(async () => {
  const db = mongoose.connection.db;
  const rooms = db.collection('rooms');
  
  const map = {
    budget: 'ekonom',
    standard: 'standartplus',
    family: 'ekonom',
    luxury: 'lyuks',
    vip: 'lyuks'
  };
  
  let total = 0;
  for (const [oldType, newType] of Object.entries(map)) {
    const setOp = { $set: { type: newType } };
    const r = await rooms.updateMany({ type: oldType }, setOp);
    if (r.modifiedCount > 0) {
      console.log(oldType + ' -> ' + newType + ': ' + r.modifiedCount + ' ta yangilandi');
      total += r.modifiedCount;
    }
  }
  
  const allTypes = await rooms.distinct('type');
  console.log('\nDB dagi barcha turlar: ' + allTypes.join(', '));
  console.log('Jami yangilandi: ' + total);
  process.exit(0);
}).catch(function(e) {
  console.error('Xatolik:', e.message);
  process.exit(1);
});
