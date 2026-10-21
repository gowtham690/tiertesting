package net.mctiers;

import net.mctiers.api.BackendClient;
import net.mctiers.arena.Arena;
import net.mctiers.arena.ArenaManager;
import net.mctiers.commands.LinkCommand;
import net.mctiers.kits.KitManager;
import net.mctiers.match.MatchManager;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.jetbrains.annotations.NotNull;

public class MCTiersPlugin extends JavaPlugin {
    private BackendClient backendClient;
    private ArenaManager arenaManager;
    private KitManager kitManager;
    private MatchManager matchManager;
    private Location lobbySpawn;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        String backendUrl = getConfig().getString("backend.url", "http://localhost:3001/api");
        String apiKey = getConfig().getString("backend.api-key", "test_plugin_secret_key");
        int timeout = getConfig().getInt("backend.timeout-seconds", 10);

        this.backendClient = new BackendClient(backendUrl, apiKey, timeout);
        this.arenaManager = new ArenaManager();
        this.kitManager = new KitManager();
        this.matchManager = new MatchManager(this);

        // Load default lobby spawn
        World world = Bukkit.getWorld(getConfig().getString("match.lobby-spawn.world", "world"));
        if (world != null) {
            this.lobbySpawn = new Location(
                    world,
                    getConfig().getDouble("match.lobby-spawn.x", 0.5),
                    getConfig().getDouble("match.lobby-spawn.y", 100.0),
                    getConfig().getDouble("match.lobby-spawn.z", 0.5)
            );
        }

        // Register default arena if none configured
        if (world != null) {
            Location s1 = new Location(world, 10.5, 100.0, 0.5, 90f, 0f);
            Location s2 = new Location(world, -10.5, 100.0, 0.5, -90f, 0f);
            arenaManager.registerArena(new Arena("arena-1", s1, s2));
        }

        // Register event listener
        getServer().getPluginManager().registerEvents(matchManager, this);

        // Register commands
        if (getCommand("link") != null) {
            getCommand("link").setExecutor(new LinkCommand(this));
        }

        getLogger().info("MCTiers Plugin enabled successfully! Connected to backend at " + backendUrl);
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, @NotNull String[] args) {
        if (command.getName().equalsIgnoreCase("tierkit") && sender instanceof Player player) {
            if (args.length > 0) {
                kitManager.giveKit(player, args[0]);
                player.sendMessage("§aEquipped " + args[0] + " kit.");
            } else {
                player.sendMessage("§cUsage: /tierkit <sword|crystal|pot|axe|mace|uhc>");
            }
            return true;
        }

        if (command.getName().equalsIgnoreCase("testmatch") && sender instanceof Player tester) {
            if (args.length >= 3 && args[0].equalsIgnoreCase("start")) {
                Player target = Bukkit.getPlayer(args[1]);
                String gamemode = args[2];
                int rounds = args.length >= 4 ? Integer.parseInt(args[3]) : 7;

                if (target == null) {
                    tester.sendMessage("§cPlayer not found or offline.");
                    return true;
                }

                boolean started = matchManager.startMatch("manual-test", target, tester, gamemode, rounds);
                if (started) {
                    tester.sendMessage("§aStarted " + gamemode + " test match against " + target.getName() + "!");
                }
                return true;
            }
        }

        return super.onCommand(sender, command, label, args);
    }

    public BackendClient getBackendClient() {
        return backendClient;
    }

    public ArenaManager getArenaManager() {
        return arenaManager;
    }

    public KitManager getKitManager() {
        return kitManager;
    }

    public MatchManager getMatchManager() {
        return matchManager;
    }

    public Location getLobbySpawn() {
        return lobbySpawn;
    }
}
