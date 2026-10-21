package net.mctiers.commands;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.mctiers.MCTiersPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

public class LinkCommand implements CommandExecutor {
    private final MCTiersPlugin plugin;

    public LinkCommand(MCTiersPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, @NotNull String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage(Component.text("This command can only be executed by players.", NamedTextColor.RED));
            return true;
        }

        player.sendMessage(Component.text("Generating your account link code...", NamedTextColor.GRAY));

        plugin.getBackendClient().generateLinkCode(player.getUniqueId(), player.getName())
                .thenAccept(code -> player.sendMessage(
                        Component.text("\n========== [ MCTiers Account Linking ] ==========\n", NamedTextColor.GOLD, TextDecoration.BOLD)
                                .append(Component.text("Your verification code is: ", NamedTextColor.YELLOW))
                                .append(Component.text(code, NamedTextColor.GREEN, TextDecoration.BOLD)
                                        .clickEvent(ClickEvent.copyToClipboard(code))
                                        .hoverEvent(HoverEvent.showText(Component.text("Click to copy to clipboard", NamedTextColor.GRAY))))
                                .append(Component.text("\n\nType ", NamedTextColor.YELLOW))
                                .append(Component.text("/link " + code, NamedTextColor.AQUA))
                                .append(Component.text(" in the Discord server to complete linking.\n" +
                                        "Code expires in 10 minutes.\n" +
                                        "=================================================\n", NamedTextColor.GRAY))
                ))
                .exceptionally(err -> {
                    player.sendMessage(Component.text("Failed to generate link code: " + err.getMessage(), NamedTextColor.RED));
                    return null;
                });

        return true;
    }
}
