namespace MaximServer.Services;

public interface IAdminService
{
    Task<bool> IsAdminAsync(string username);
    Task<bool> ClearChatAsync(string username);
}

