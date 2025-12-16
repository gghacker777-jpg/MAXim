using Microsoft.EntityFrameworkCore;
using MaximServer.Models;

namespace MaximServer.Data;

public class MaximDbContext : DbContext
{
    public MaximDbContext(DbContextOptions<MaximDbContext> options) : base(options) { }

    public DbSet<Message> Messages { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Уникальный индекс на Username (без учета регистра)
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
    }
}

