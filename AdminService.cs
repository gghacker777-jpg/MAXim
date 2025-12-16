using MaximServer.Data;
using Microsoft.EntityFrameworkCore;

namespace MaximServer.Services;

public class AdminService : IAdminService
{
    private readonly MaximDbContext _context;
    private const string ADMIN_USERNAME = "Создатель";

    public AdminService(MaximDbContext context)
    {
        _context = context;
    }

    public Task<bool> IsAdminAsync(string username)
    {
        // Строгое сравнение для русского текста (без учета регистра не работает корректно для кириллицы)
        return Task.FromResult(username == ADMIN_USERNAME);
    }

    public async Task<bool> ClearChatAsync(string username)
    {
        if (!await IsAdminAsync(username))
        {
            return false;
        }

        _context.Messages.RemoveRange(_context.Messages);
        await _context.SaveChangesAsync();
        return true;
    }
}

