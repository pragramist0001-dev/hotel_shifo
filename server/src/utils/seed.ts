import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Room from '../models/Room';

dotenv.config();

const seedData = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sanatory_crm';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected for seeding');

    // Admin yaratish
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      await User.create({
        fullName: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        phone: '+998901234567',
        isActive: true,
      });
      console.log('✅ Admin yaratildi: admin / admin123');
    } else {
      console.log('ℹ️ Admin allaqachon mavjud');
    }

    // Reception yaratish
    const existingReception = await User.findOne({ username: 'reception' });
    if (!existingReception) {
      await User.create({
        fullName: 'Reception Xodim',
        username: 'reception',
        password: 'reception123',
        role: 'reception',
        phone: '+998907654321',
        isActive: true,
      });
      console.log('✅ Reception yaratildi: reception / reception123');
    } else {
      console.log('ℹ️ Reception allaqachon mavjud');
    }

    // Xonalar yaratish
    const existingRooms = await Room.countDocuments();
    if (existingRooms === 0) {
      const rooms = [
        // 1-qavat: Budget
        { roomNumber: '101', type: 'budget', floor: 1, pricePerNight: 200000, amenities: ['Wi-Fi', 'TV'], description: 'Oddiy xona' },
        { roomNumber: '102', type: 'budget', floor: 1, pricePerNight: 200000, amenities: ['Wi-Fi', 'TV'], description: 'Oddiy xona' },
        { roomNumber: '103', type: 'standard', floor: 1, pricePerNight: 350000, amenities: ['Wi-Fi', 'TV', 'AC'], description: 'Standart xona' },
        { roomNumber: '104', type: 'standard', floor: 1, pricePerNight: 350000, amenities: ['Wi-Fi', 'TV', 'AC'], description: 'Standart xona' },
        // 2-qavat: Standard + Family
        { roomNumber: '201', type: 'standard', floor: 2, pricePerNight: 400000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar'], description: 'Standart xona' },
        { roomNumber: '202', type: 'standard', floor: 2, pricePerNight: 400000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar'], description: 'Standart xona' },
        { roomNumber: '203', type: 'family', floor: 2, pricePerNight: 550000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Balkon'], description: 'Oilaviy keng xona' },
        { roomNumber: '204', type: 'family', floor: 2, pricePerNight: 550000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Balkon'], description: 'Oilaviy keng xona' },
        // 3-qavat: VIP + Luxury
        { roomNumber: '301', type: 'vip', floor: 3, pricePerNight: 750000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Balkon', 'Jakuzi'], description: 'VIP xona' },
        { roomNumber: '302', type: 'vip', floor: 3, pricePerNight: 750000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Balkon', 'Jakuzi'], description: 'VIP xona' },
        { roomNumber: '303', type: 'luxury', floor: 3, pricePerNight: 1200000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Balkon', 'Jakuzi', 'Sauna', 'Kong\'il ochar xona'], description: 'Hashamatli lyuks xona' },
        { roomNumber: '304', type: 'luxury', floor: 3, pricePerNight: 1200000, amenities: ['Wi-Fi', 'TV', 'AC', 'Mini-bar', 'Balkon', 'Jakuzi', 'Sauna', 'Kong\'il ochar xona'], description: 'Hashamatli lyuks xona' },
      ];

      await Room.insertMany(rooms);
      console.log(`✅ ${rooms.length} ta xona yaratildi`);
    } else {
      console.log(`ℹ️ ${existingRooms} ta xona allaqachon mavjud`);
    }

    console.log('\n🎉 Seed muvaffaqiyatli yakunlandi!');
    console.log('\n📋 Login ma\'lumotlari:');
    console.log('   Admin:     admin / admin123');
    console.log('   Reception: reception / reception123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed xatosi:', error);
    process.exit(1);
  }
};

seedData();
