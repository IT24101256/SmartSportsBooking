using System.Collections.Concurrent;

namespace SmartSportsFacilityBooking.Services;

/// <summary>
/// Thread-safe in-memory OTP store. Each pending registration stores the OTP,
/// expiry, and the user details so we can create the account only after verification.
/// </summary>
public class OtpStore
{
    private record PendingRegistration(
        string FullName,
        string Email,
        string PasswordHash,
        string Otp,
        DateTime ExpiresAtUtc);

    private readonly ConcurrentDictionary<string, PendingRegistration> _store = new(StringComparer.OrdinalIgnoreCase);

    public string GenerateAndStore(string email, string fullName, string passwordHash)
    {
        var otp = new Random().Next(100000, 999999).ToString();
        var record = new PendingRegistration(fullName, email, passwordHash, otp, DateTime.UtcNow.AddMinutes(10));
        _store[email] = record;
        return otp;
    }

    public (bool Valid, string? FullName, string? PasswordHash) Verify(string email, string otp)
    {
        if (!_store.TryGetValue(email, out var record))
            return (false, null, null);

        if (record.ExpiresAtUtc < DateTime.UtcNow)
        {
            _store.TryRemove(email, out _);
            return (false, null, null);
        }

        if (!string.Equals(record.Otp, otp.Trim(), StringComparison.Ordinal))
            return (false, null, null);

        _store.TryRemove(email, out _);
        return (true, record.FullName, record.PasswordHash);
    }
}
