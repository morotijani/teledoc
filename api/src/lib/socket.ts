import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'teledoc_super_secure_jwt_secret_ghana_telemed_2026';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: UserRole;
    fullName: string;
  };
}

export function setupSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Handshake authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers['authorization'] as string)?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, fullName: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.io] User connected: ${socket.user?.fullName} (${socket.user?.id})`);

    // Join appointment consultation room
    socket.on('join_consultation', async ({ appointmentId }: { appointmentId: string }) => {
      if (!appointmentId || !socket.user) return;

      // Verify the user is either the doctor or the patient of this appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { patientId: true, doctorId: true },
      });

      if (!appointment) {
        socket.emit('error_message', { message: 'Appointment not found' });
        return;
      }

      if (appointment.patientId !== socket.user.id && appointment.doctorId !== socket.user.id) {
        socket.emit('error_message', { message: 'Unauthorized access to this consultation room' });
        return;
      }

      const roomName = `appointment:${appointmentId}`;
      socket.join(roomName);
      console.log(`[Socket.io] User ${socket.user.fullName} joined room ${roomName}`);

      socket.to(roomName).emit('user_joined', {
        userId: socket.user.id,
        fullName: socket.user.fullName,
        role: socket.user.role,
      });
    });

    // Send chat message in consultation
    socket.on(
      'send_message',
      async ({
        appointmentId,
        message,
        attachmentUrl,
      }: {
        appointmentId: string;
        message: string;
        attachmentUrl?: string;
      }) => {
        if (!socket.user || !appointmentId || !message?.trim()) return;

        try {
          const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { patientId: true, doctorId: true },
          });

          if (
            !appointment ||
            (appointment.patientId !== socket.user.id &&
              appointment.doctorId !== socket.user.id &&
              socket.user.role !== UserRole.ADMIN)
          ) {
            socket.emit('error_message', { message: 'Unauthorized to send message in this room' });
            return;
          }

          const chatMessage = await prisma.chatMessage.create({
            data: {
              appointmentId,
              senderId: socket.user.id,
              message: message.trim(),
              attachmentUrl,
            },
            include: {
              sender: {
                select: { id: true, fullName: true, role: true, avatarUrl: true },
              },
            },
          });

          const roomName = `appointment:${appointmentId}`;
          io.to(roomName).emit('new_message', chatMessage);
        } catch (error) {
          console.error('[Socket.io] Failed to save chat message:', error);
          socket.emit('error_message', { message: 'Failed to deliver message' });
        }
      }
    );

    // Typing indicators
    socket.on('typing_start', ({ appointmentId }: { appointmentId: string }) => {
      if (!socket.user) return;
      socket.to(`appointment:${appointmentId}`).emit('user_typing', {
        userId: socket.user.id,
        fullName: socket.user.fullName,
      });
    });

    socket.on('typing_stop', ({ appointmentId }: { appointmentId: string }) => {
      if (!socket.user) return;
      socket.to(`appointment:${appointmentId}`).emit('user_stopped_typing', {
        userId: socket.user.id,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${socket.user?.fullName}`);
    });
  });

  return io;
}
