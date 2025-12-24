# Script fix lỗi Windows Long Path cho Android build
# Chạy: .\scripts\fix-android-long-path.ps1

Write-Host "=== Fix Android Long Path Issue ===" -ForegroundColor Cyan

$androidDir = "packages/mobile/android"
$buildGradle = "$androidDir/app/build.gradle"
$gradleProps = "$androidDir/gradle.properties"

# 1. Fix build.gradle - thêm externalNativeBuild
Write-Host "`n[1/3] Checking build.gradle..." -ForegroundColor Yellow
$buildContent = Get-Content $buildGradle -Raw

if ($buildContent -notmatch "buildStagingDirectory") {
    $buildContent = $buildContent -replace "(namespace 'com\.tomisakae\.ziasub')", @"
namespace 'com.tomisakae.ziasub'

    // Fix Windows long path issue - use shorter build directory for CMake
    externalNativeBuild {
        cmake {
            buildStagingDirectory "C:/tmp/cxx"
        }
    }
"@
    Set-Content $buildGradle $buildContent
    Write-Host "  -> Added externalNativeBuild config" -ForegroundColor Green
} else {
    Write-Host "  -> Already configured" -ForegroundColor Gray
}

# 2. Fix gradle.properties - thêm buildCacheDir
Write-Host "`n[2/3] Checking gradle.properties..." -ForegroundColor Yellow
$propsContent = Get-Content $gradleProps -Raw

if ($propsContent -notmatch "android\.buildCacheDir") {
    Add-Content $gradleProps "`n# Fix Windows long path issue - use shorter build directory`nandroid.buildCacheDir=C:/tmp/gradle-cache"
    Write-Host "  -> Added buildCacheDir config" -ForegroundColor Green
} else {
    Write-Host "  -> Already configured" -ForegroundColor Gray
}

# 3. Xóa thư mục build cũ
Write-Host "`n[3/3] Cleaning old build directories..." -ForegroundColor Yellow
$dirsToClean = @(
    "$androidDir/app/.cxx",
    "$androidDir/build",
    "$androidDir/app/build"
)

foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir
        Write-Host "  -> Deleted $dir" -ForegroundColor Green
    }
}

Write-Host "`n=== Done! Now run: bun run mobile:android ===" -ForegroundColor Cyan
