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
        string ContactNumber,
        string NicNumber,
        string PasswordHash,
        string Otp,
        DateTime ExpiresAtUtc);

    private readonly ConcurrentDictionary<string, PendingRegistration> _store = new(StringComparer.OrdinalIgnoreCase);

    public string GenerateAndStore(string email, string fullName, string contactNumber, string nicNumber, string passwordHash)
    {
        var otp = new Random().Next(100000, 999999).ToString();
        var record = new PendingRegistration(fullName, email, contactNumber, nicNumber, passwordHash, otp, DateTime.UtcNow.AddMinutes(10));
        _store[email] = record;
        return otp;
    }

    public (bool Valid, string? FullName, string? ContactNumber, string? NicNumber, string? PasswordHash) Verify(string email, string otp)
    {
        if (!_store.TryGetValue(email, out var record))
            return (false, null, null, null, null);

        if (record.ExpiresAtUtc < DateTime.UtcNow)
        {
            _store.TryRemove(email, out _);
            return (false, null, null, null, null);
        }

        if (!string.Equals(record.Otp, otp.Trim(), StringComparison.Ordinal))
            return (false, null, null, null, null);

        _store.TryRemove(email, out _);
        return (true, record.FullName, record.ContactNumber, record.NicNumber, record.PasswordHash);
    }

    private record PendingReset(string Email, string Otp, DateTime ExpiresAtUtc);
    private readonly ConcurrentDictionary<string, PendingReset> _resetStore = new(StringComparer.OrdinalIgnoreCase);

    public string GenerateAndStoreResetOtp(string email)
    {
        var otp = new Random().Next(100000, 999999).ToString();
        _resetStore[email] = new PendingReset(email, otp, DateTime.UtcNow.AddMinutes(10));
        return otp;
    }

    public bool VerifyResetOtp(string email, string otp)
    {
        if (!_resetStore.TryGetValue(email, out var record))
            return false;

        if (record.ExpiresAtUtc < DateTime.UtcNow)
        {
            _resetStore.TryRemove(email, out _);
            return false;
        }

        if (!string.Equals(record.Otp, otp.Trim(), StringComparison.Ordinal))
            return false;

        _resetStore.TryRemove(email, out _);
        return true;
    }

    public (bool Found, string? Otp, string? FullName) ResendRegistrationOtp(string email)
    {
        if (!_store.TryGetValue(email, out var record))
            return (false, null, null);

        var newOtp = new Random().Next(100000, 999999).ToString();
        var updated = record with { Otp = newOtp, ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10) };
        _store[email] = updated;
        return (true, newOtp, updated.FullName);
    }

    public (bool Found, string? Otp) ResendResetOtp(string email)
    {
        if (!_resetStore.TryGetValue(email, out var record))
            return (false, null);

        var newOtp = new Random().Next(100000, 999999).ToString();
        var updated = record with { Otp = newOtp, ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10) };
        _resetStore[email] = updated;
        return (true, newOtp);
    }
}

