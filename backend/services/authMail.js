const nodemailer = require('nodemailer')
const { getAdmin } = require('../lib/supabase')

let transport
function mailTransport() {
    if (!transport) transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        requireTLS: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000
    })
    return transport
}

function registrationMessage(row, adminEmail) {
    const admin = row.kind === 'registration_admin'
    return {
        from: { name: 'Basketsfera', address: process.env.SMTP_ADMIN_EMAIL || adminEmail },
        to: admin ? adminEmail : row.email,
        subject: admin ? 'Basketsfera — новый пользователь' : 'Добро пожаловать в Basketsfera!',
        text: admin
            ? `Успешная регистрация в Basketsfera.\nИмя: ${row.first_name}\nEmail: ${row.email}\nАдрес подтверждён шестизначным кодом.`
            : `${row.first_name}, регистрация в Basketsfera прошла успешно!\nВаш email ${row.email} подтверждён. Вы можете войти на сайт и пользоваться профилем.\nПароль и коды подтверждения мы никогда не включаем в уведомления.`
    }
}

let running = false
async function processAuthMail() {
    if (running || !process.env.SMTP_HOST || !process.env.SMTP_PASS) return
    running = true
    try {
        const db = getAdmin()
        const { data, error } = await db.from('auth_email_outbox').select('*')
            .is('delivered_at', null).lte('next_attempt_at', new Date().toISOString()).order('id').limit(10)
        if (error) throw error
        for (const row of data || []) {
            try {
                await mailTransport().sendMail(registrationMessage(row, process.env.SMTP_ADMIN_EMAIL))
                const { error } = await db.from('auth_email_outbox').update({ delivered_at: new Date().toISOString(), attempts: row.attempts + 1 }).eq('id', row.id)
                if (error) throw error
            } catch (error) {
                // Retry each recipient independently; never log credentials or message contents.
                await db.from('auth_email_outbox').update({
                    attempts: row.attempts + 1,
                    next_attempt_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(row.attempts, 6))).toISOString()
                }).eq('id', row.id)
                console.error('Registration email delivery failed', { id: row.id, code: error.code || 'delivery_error' })
            }
        }
    } catch (error) {
        console.error('Registration email queue unavailable', { code: error.code || 'queue_error' })
    } finally { running = false }
}
function startAuthMail() {
    void processAuthMail()
    setInterval(processAuthMail, 10000).unref()
}
module.exports = { startAuthMail, processAuthMail, registrationMessage, mailTransport }
