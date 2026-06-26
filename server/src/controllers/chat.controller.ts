import { Response } from 'express';
import Message from '../models/Message';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';

// Faqat sender va receiver ga socket yuborish uchun helper
const emitChatUpdate = (req: AuthRequest, senderId: string, receiverId: string) => {
  const io = req.app.get('io');
  if (!io) return;

  // Faqat sender va receiver'ning xonalariga yuborish
  io.to(`user:${senderId}`).emit('chat:update');
  io.to(`user:${receiverId}`).emit('chat:update');
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ _id: { $ne: req.user!._id } })
      .select('fullName username role isActive')
      .sort({ fullName: 1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ message: 'userId talab qilinadi' });
      return;
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user!._id, receiver: userId },
        { sender: userId, receiver: req.user!._id }
      ]
    })
      .populate('sender', 'fullName username role')
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Xabarlarni olish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, receiverId } = req.body;
    
    if (!content || !content.trim() || !receiverId) {
      res.status(400).json({ message: 'Xabar matni va qabul qiluvchi majburiy' });
      return;
    }

    const newMessage = await Message.create({
      sender: req.user!._id,
      receiver: receiverId,
      content: content.trim()
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'fullName username role');

    // Faqat sender va receiver ga real-time yuborish
    emitChatUpdate(req, req.user!._id.toString(), receiverId);

    res.status(201).json({ message: 'Yuborildi', chatMessage: populatedMessage });
  } catch (error) {
    console.error('Xabar yuborish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const message = await Message.findById(id);

    if (!message) {
      res.status(404).json({ message: 'Xabar topilmadi' });
      return;
    }

    // Faqat o'z xabarini tahrirlashi mumkin
    if (message.sender.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: "Bunga ruxsat yo'q" });
      return;
    }

    if (!content || !content.trim()) {
      res.status(400).json({ message: "Xabar matni bo'sh bo'lishi mumkin emas" });
      return;
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    const populatedMessage = await Message.findById(id)
      .populate('sender', 'fullName username role');

    // Faqat sender va receiver ga real-time yuborish
    emitChatUpdate(req, req.user!._id.toString(), message.receiver.toString());

    res.json({ message: 'Tahrirlandi', chatMessage: populatedMessage });
  } catch (error) {
    console.error('Xabar tahrirlash xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);

    if (!message) {
      res.status(404).json({ message: 'Xabar topilmadi' });
      return;
    }

    // Faqat o'z xabarini yoki admin hamma xabarni o'chirishi mumkin
    if (message.sender.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
      res.status(403).json({ message: "Bunga ruxsat yo'q" });
      return;
    }

    const senderId = message.sender.toString();
    const receiverId = message.receiver.toString();

    await Message.findByIdAndDelete(id);

    // Faqat sender va receiver ga real-time yuborish
    emitChatUpdate(req, senderId, receiverId);

    res.json({ message: "O'chirildi" });
  } catch (error) {
    console.error("Xabar o'chirish xatosi:", error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};
