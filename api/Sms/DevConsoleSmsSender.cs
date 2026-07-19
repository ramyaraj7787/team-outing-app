namespace TeamOutingApi.Sms;

// Used automatically when no provider credentials are set. Nothing is actually
// sent — the code is logged server-side, and AuthController also returns it
// directly in the API response so the app is testable without any SMS account.
public class DevConsoleSmsSender : ISmsSender
{
    public bool IsConfigured => false;

    public Task<bool> SendAsync(string phoneNumber, string message)
    {
        Console.WriteLine($"[DEV SMS] To {phoneNumber}: {message}");
        return Task.FromResult(true);
    }
}
