import { Router } from 'express'
import healthRouter from './health'
import authRouter from './auth'
import drawsRouter from './draws'
import ticketsRouter from './tickets'
import depositsRouter from './deposits'
import userRouter from './user'
import adminRouter from './admin'
import settingsRouter from './settings'
import adsRouter from './ads'
import winnerRouter from './winner'
import businessCodesRouter from './business-codes'
import couponsRouter from './coupons'

const router = Router()

router.use(healthRouter)
router.use('/auth', authRouter)
router.use('/draws', drawsRouter)
router.use('/tickets', ticketsRouter)
router.use('/deposits', depositsRouter)
router.use('/user', userRouter)
router.use('/admin', adminRouter)
router.use('/settings', settingsRouter)
router.use('/ads', adsRouter)
router.use('/winner', winnerRouter)
router.use('/business-codes', businessCodesRouter)
router.use('/coupons', couponsRouter)

export default router
