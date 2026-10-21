package net.mctiers.match;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.title.Title;
import net.mctiers.MCTiersPlugin;
import net.mctiers.arena.Arena;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.PlayerDeathEvent;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class MatchManager implements Listener {
    private final MCTiersPlugin plugin;
    private final Map<UUID, TestMatch> activeMatches = new ConcurrentHashMap<>();

    public MatchManager(MCTiersPlugin plugin) {
        this.plugin = plugin;
    }

    public boolean startMatch(String testId, Player player, Player tester, String gamemode, int targetWins) {
        Optional<Arena> optArena = plugin.getArenaManager().allocateAvailableArena();
        if (optArena.isEmpty()) {
            tester.sendMessage(Component.text("No match arenas currently available!", NamedTextColor.RED));
            return false;
        }

        Arena arena = optArena.get();
        TestMatch match = new TestMatch(testId, player, tester, gamemode, arena, targetWins);

        activeMatches.put(player.getUniqueId(), match);
        activeMatches.put(tester.getUniqueId(), match);

        // Teleport to spawns
        tester.teleport(arena.getSpawn1());
        player.teleport(arena.getSpawn2());

        // Give kits
        plugin.getKitManager().giveKit(tester, gamemode);
        plugin.getKitManager().giveKit(player, gamemode);

        // Announce
        Component titleComp = Component.text("MATCH START", NamedTextColor.GOLD, TextDecoration.BOLD);
        Component subComp = Component.text(gamemode.toUpperCase() + " | First to " + targetWins, NamedTextColor.YELLOW);
        Title title = Title.title(titleComp, subComp, Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(2), Duration.ofMillis(500)));

        player.showTitle(title);
        tester.showTitle(title);

        return true;
    }

    @EventHandler
    public void onPlayerDeath(PlayerDeathEvent event) {
        Player victim = event.getPlayer();
        TestMatch match = activeMatches.get(victim.getUniqueId());

        if (match == null || !match.isActive()) {
            return;
        }

        event.getDrops().clear();
        event.setDroppedExp(0);

        boolean isPlayerVictim = victim.getUniqueId().equals(match.getPlayer().getUniqueId());

        if (isPlayerVictim) {
            match.incrementTesterScore();
        } else {
            match.incrementPlayerScore();
        }

        Component scoreMessage = Component.text("\n[Round Over] ", NamedTextColor.GOLD, TextDecoration.BOLD)
                .append(Component.text(match.getPlayer().getName() + ": " + match.getPlayerScore(), NamedTextColor.GREEN))
                .append(Component.text(" | ", NamedTextColor.GRAY))
                .append(Component.text(match.getTester().getName() + ": " + match.getTesterScore() + "\n", NamedTextColor.RED));

        match.getPlayer().sendMessage(scoreMessage);
        match.getTester().sendMessage(scoreMessage);

        if (match.isFinished()) {
            endMatch(match);
        } else {
            // Respawn and reset for next round
            Bukkit.getScheduler().runTaskLater(plugin, () -> {
                match.getTester().teleport(match.getArena().getSpawn1());
                match.getPlayer().teleport(match.getArena().getSpawn2());
                plugin.getKitManager().giveKit(match.getTester(), match.getGamemode());
                plugin.getKitManager().giveKit(match.getPlayer(), match.getGamemode());
            }, 20L);
        }
    }

    public void endMatch(TestMatch match) {
        match.setActive(false);
        activeMatches.remove(match.getPlayer().getUniqueId());
        activeMatches.remove(match.getTester().getUniqueId());

        // Release arena
        plugin.getArenaManager().releaseArena(match.getArena().getId());

        Component endTitle = Component.text("MATCH CONCLUDED", NamedTextColor.GREEN, TextDecoration.BOLD);
        Component endScore = Component.text(match.getPlayer().getName() + " (" + match.getPlayerScore() + ") - " +
                match.getTester().getName() + " (" + match.getTesterScore() + ")", NamedTextColor.YELLOW);

        Title title = Title.title(endTitle, endScore);
        match.getPlayer().showTitle(title);
        match.getTester().showTitle(title);

        // Teleport back to lobby
        Location lobby = plugin.getLobbySpawn();
        if (lobby != null) {
            match.getPlayer().teleport(lobby);
            match.getTester().teleport(lobby);
        }

        // Notify tester
        match.getTester().sendMessage(Component.text("Match completed! Score: " + match.getPlayerScore() + " - " + match.getTesterScore() +
                ". You can confirm result in Discord ticket.", NamedTextColor.AQUA));
    }

    public Optional<TestMatch> getMatchForPlayer(Player player) {
        return Optional.ofNullable(activeMatches.get(player.getUniqueId()));
    }
}
