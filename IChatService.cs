using MaximServer.Models;

namespace MaximServer.Services;

public interface IChatService
{
    Task<List<Message>> GetMessagesAsync();
    Task<Message?> SendMessageAsync(string author, string text);
    Task<bool> CanSendMessageAsync(string author);
    Task<bool> IsUsernameAvailableAsync(string username);
}

