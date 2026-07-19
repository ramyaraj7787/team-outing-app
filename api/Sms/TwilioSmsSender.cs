using System.Net.Http.Headers;
using System.Text;

namespace TeamOutingApi.Sms;

// Sends via Twilio's REST API directly (no SDK needed). Requires a Twilio account,
// a purchased/verified sender number, and — for sending to Indian numbers — a
// registered sender ID and message template per TRAI's DLT rules.
// Docs: https://www.twilio.com/docs/sms/send-messages
public class TwilioSmsSender : ISmsSender
{
    private readonly HttpClient _http;
    private readonly string _accountSid;
    private readonly string _authToken;
    private readonly string _fromNumber;

    public TwilioSmsSender(HttpClient http, string accountSid, string authToken, string fromNumber)
    {
        _http = http;
        _accountSid = accountSid;
        _authToken = authToken;
        _fromNumber = fromNumber;
    }

    public bool IsConfigured => true;

    public async Task<bool> SendAsync(string phoneNumber, string message)
    {
        var url = $"https://api.twilio.com/2010-04-01/Accounts/{_accountSid}/Messages.json";
        var authBytes = Encoding.ASCII.GetBytes($"{_accountSid}:{_authToken}");

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["To"] = phoneNumber,
            ["From"] = _fromNumber,
            ["Body"] = message,
        });

        var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"[TWILIO ERROR] {response.StatusCode}: {body}");
            return false;
        }
        return true;
    }
}
