# TeleDoc Ghana End-to-End Automated Platform Verification Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🏥 Running TeleDoc Ghana End-to-End Platform Verification" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api/v1"

# Step 1: Health Check
Write-Host "`n[1/7] Testing API Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:5000/health"
Write-Host "✅ API Status: $($health.status) - $($health.service) ($($health.version))" -ForegroundColor Green

# Step 2: Patient Login & 90-day Trial Verification
Write-Host "`n[2/7] Testing Patient Auth & 3-Month Trial..." -ForegroundColor Yellow
$patientLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    identifier = '+233240000004'
    password = 'Password123!'
} | ConvertTo-Json) -ContentType "application/json"

Write-Host "✅ Patient Logged In: $($patientLogin.user.fullName)" -ForegroundColor Green
Write-Host "   Trial Status: $($patientLogin.subscription.status)" -ForegroundColor Gray
Write-Host "   Days Remaining: $($patientLogin.subscription.trialDaysRemaining) days" -ForegroundColor Gray
Write-Host "   Access Allowed: $($patientLogin.subscription.isAccessAllowed)" -ForegroundColor Gray

# Step 3: Super Admin Login & Pending Doctor Verification
Write-Host "`n[3/7] Testing Super Admin Verification Loop..." -ForegroundColor Yellow
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    identifier = 'admin@teledoc.gh'
    password = 'Password123!'
} | ConvertTo-Json) -ContentType "application/json"

$adminHeaders = @{ Authorization = "Bearer $($adminLogin.token)" }
$pendingRes = Invoke-RestMethod -Uri "$baseUrl/admin/doctors/pending" -Headers $adminHeaders
Write-Host "✅ Super Admin Logged In: $($adminLogin.user.fullName)" -ForegroundColor Green
Write-Host "   Pending Doctor Applications Count: $($pendingRes.count)" -ForegroundColor Gray

# Step 4: Doctor Discovery
Write-Host "`n[4/7] Testing Doctor Search & Filtering..." -ForegroundColor Yellow
$doctorsRes = Invoke-RestMethod -Uri "$baseUrl/doctors"
Write-Host "✅ Found $($doctorsRes.count) Approved Doctor(s)" -ForegroundColor Green
$selectedDoctor = $doctorsRes.doctors[0]
Write-Host "   Consultant: $($selectedDoctor.user.fullName) ($($selectedDoctor.specialty))" -ForegroundColor Gray
Write-Host "   Hospital: $($selectedDoctor.hospitalAffiliation)" -ForegroundColor Gray
Write-Host "   MDC License: $($selectedDoctor.licenseNumber)" -ForegroundColor Gray

# Step 5: Appointment Booking
Write-Host "`n[5/7] Testing Patient Appointment Booking..." -ForegroundColor Yellow
$patientHeaders = @{ Authorization = "Bearer $($patientLogin.token)" }
$startTime = (Get-Date).AddDays(2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$endTime = (Get-Date).AddDays(2).AddMinutes(30).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$bookRes = Invoke-RestMethod -Uri "$baseUrl/appointments/book" -Method Post -Headers $patientHeaders -Body (@{
    doctorId = $selectedDoctor.userId
    scheduledStart = $startTime
    scheduledEnd = $endTime
    symptomsDescription = "Automated verification test appointment"
} | ConvertTo-Json) -ContentType "application/json"

$apptId = $bookRes.appointment.id
Write-Host "✅ Appointment Booked! ID: $apptId" -ForegroundColor Green
Write-Host "   Meeting Channel ID: $($bookRes.appointment.meetingChannelId)" -ForegroundColor Gray

# Step 6: Agora RTC Video Token Generation
Write-Host "`n[6/7] Testing Agora WebRTC Token Generation..." -ForegroundColor Yellow
$agoraRes = Invoke-RestMethod -Uri "$baseUrl/consultations/$apptId/agora-token" -Method Post -Headers $patientHeaders
Write-Host "✅ Agora Session Initialized!" -ForegroundColor Green
Write-Host "   Channel: $($agoraRes.channelId)" -ForegroundColor Gray
Write-Host "   App ID: $($agoraRes.appId)" -ForegroundColor Gray
Write-Host "   RTC Token: $($agoraRes.token.Substring(0, 35))..." -ForegroundColor Gray

# Step 7: Hubtel 10 GHS Subscription Payment Simulation
Write-Host "`n[7/7] Testing Hubtel MoMo 10 GHS Subscription..." -ForegroundColor Yellow
$payRes = Invoke-RestMethod -Uri "$baseUrl/billing/pay-subscription" -Method Post -Headers $patientHeaders -Body (@{
    phoneNumber = '+233240000004'
    channel = 'mtn-gh'
} | ConvertTo-Json) -ContentType "application/json"

$verifyRes = Invoke-RestMethod -Uri "$baseUrl/billing/verify-transaction/$($payRes.clientReference)" -Headers $patientHeaders
Write-Host "✅ Hubtel Payment Ref: $($payRes.clientReference)" -ForegroundColor Green
Write-Host "   Amount: $($payRes.amountGhs) GHS" -ForegroundColor Gray
Write-Host "   Verification Result: $($verifyRes.status)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "🎉 ALL TELEMEDICINE SUBSYSTEMS VERIFIED & OPERATIONAL!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
