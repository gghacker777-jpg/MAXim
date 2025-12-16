using Microsoft.EntityFrameworkCore;
using MaximServer.Data;
using MaximServer.Models;

namespace MaximServer.Services;

public class ChatService : IChatService
{
    private readonly MaximDbContext _context;
    private const int MAX_MESSAGES_PER_MINUTE = 5; // Лимит: 5 сообщений в минуту
    private const int MAX_MESSAGES_PER_HOUR = 30; // Лимит: 30 сообщений в час

    public ChatService(MaximDbContext context)
    {
        _context = context;
    }

    public async Task<List<Message>> GetMessagesAsync()
    {
        return await _context.Messages
            .OrderBy(m => m.Timestamp)
            .ToListAsync();
    }

    public async Task<Message?> SendMessageAsync(string author, string text)
    {
        // Проверка на спам
        if (!await CanSendMessageAsync(author))
        {
            return null;
        }

        var message = new Message
        {
            Author = author,
            Text = text,
            Timestamp = DateTime.UtcNow
        };

        _context.Messages.Add(message);

        // Обновляем статистику пользователя
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == author);
        if (user == null)
        {
            user = new User
            {
                Username = author,
                LastMessageTime = DateTime.UtcNow,
                MessageCount = 1
            };
            _context.Users.Add(user);
        }
        else
        {
            user.LastMessageTime = DateTime.UtcNow;
            user.MessageCount++;
        }

        await _context.SaveChangesAsync();
        return message;
    }

    public async Task<bool> CanSendMessageAsync(string author)
    {
        var now = DateTime.UtcNow;
        var oneMinuteAgo = now.AddMinutes(-1);
        var oneHourAgo = now.AddHours(-1);

        // Проверка лимита сообщений за минуту
        var messagesLastMinute = await _context.Messages
            .Where(m => m.Author == author && m.Timestamp >= oneMinuteAgo)
            .CountAsync();

        if (messagesLastMinute >= MAX_MESSAGES_PER_MINUTE)
        {
            return false; // Слишком много сообщений за минуту
        }

        // Проверка лимита сообщений за час
        var messagesLastHour = await _context.Messages
            .Where(m => m.Author == author && m.Timestamp >= oneHourAgo)
            .CountAsync();

        if (messagesLastHour >= MAX_MESSAGES_PER_HOUR)
        {
            return false; // Слишком много сообщений за час
        }

        return true;
    }

    public async Task<bool> IsUsernameAvailableAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return false;
        }

        // Проверяем, существует ли уже пользователь с таким именем
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());

        return existingUser == null;
    }
}

