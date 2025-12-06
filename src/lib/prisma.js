// ========================================
// Prisma Client Singleton
// ========================================
// ใช้ Singleton Pattern เพื่อป้องกันการสร้าง Connection ซ้ำ
// ซึ่งจะช่วยประหยัด Database Connections และป้องกัน Connection Exhaustion

const { PrismaClient } = require('@prisma/client');

// สร้าง global symbol เพื่อเก็บ instance
const globalForPrisma = globalThis;

// ใช้ instance เดิมถ้ามี หรือสร้างใหม่ถ้ายังไม่มี
const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// เก็บ instance ไว้ใน global (เฉพาะ development mode)
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;
