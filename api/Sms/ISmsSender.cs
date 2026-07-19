namespace TeamOutingApi.Sms;

public interface ISmsSender
{
    // True once real credentials are configured. AuthController uses this to
    // decide whether it's still safe to echo the OTP back in the API response
    // (only safe when nothing is actually being texted).
    bool IsConfigured { get; }

    Task<bool> SendAsync(string phoneNumber, string message);
}
