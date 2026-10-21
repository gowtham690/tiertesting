package net.mctiers.match;

import net.mctiers.arena.Arena;
import org.bukkit.entity.Player;

public class TestMatch {
    private final String testId;
    private final Player player;
    private final Player tester;
    private final String gamemode;
    private final Arena arena;
    private final int targetWins;

    private int playerScore = 0;
    private int testerScore = 0;
    private boolean active = true;

    public TestMatch(String testId, Player player, Player tester, String gamemode, Arena arena, int targetWins) {
        this.testId = testId;
        this.player = player;
        this.tester = tester;
        this.gamemode = gamemode;
        this.arena = arena;
        this.targetWins = targetWins;
    }

    public void incrementPlayerScore() {
        this.playerScore++;
    }

    public void incrementTesterScore() {
        this.testerScore++;
    }

    public boolean isFinished() {
        return playerScore >= targetWins || testerScore >= targetWins;
    }

    public String getTestId() {
        return testId;
    }

    public Player getPlayer() {
        return player;
    }

    public Player getTester() {
        return tester;
    }

    public String getGamemode() {
        return gamemode;
    }

    public Arena getArena() {
        return arena;
    }

    public int getPlayerScore() {
        return playerScore;
    }

    public int getTesterScore() {
        return testerScore;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
