class Player {
  constructor(game) {
    this.game = game;
    this.width = 10;
    this.height = 20;

    const startX = this.game.width / 2;
    const startY = this.game.terrain.getGroundY(startX) - this.height;
    this.x = startX;
    this.y = startY;

    this.baseSpeed = 3.5;
    this.speed = this.baseSpeed;
    this.velocityY = 0;
    this.gravity = 0.5;
    this.jumpStrength = -12;
    this.isGrounded = false;
    this.staffAngle = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.isInvulnerable = false;
    this.invulnerabilityDuration = 1000;
    this.invulnerabilityTimer = 0;
    this.latchedParasites = 0;
    this.parasiteDamageTimer = 0;
    this.isMoving = false;
    this.killCount = 0;
    this.upgrades = {};

    this.parasiteParticleTimer = 0;
    this.parasiteParticleInterval = 100; // Gera partículas a cada 100ms
    this.parasiteParticleColor = "#8b0000"; // Vermelho escuro/marrom para sangue
    this.parasiteParticleCount = 1; // Quantidade de partículas por emissão (mantenha baixo para não sobrecarregar)

    upgradePool.forEach((up) => {
      this.upgrades[up.id] = { level: 0, ...up.initialValues };
    });
    this.speedBoosts = [];
    this.orbs = [];
  }
  update(input, mouse, deltaTime) {
    this.isMoving = input.keys.includes("a") || input.keys.includes("d");
    if (input.keys.includes("a")) this.x -= this.speed;
    if (input.keys.includes("d")) this.x += this.speed;

    this.velocityY += this.gravity;
    this.y += this.velocityY;

    if (this.x < this.width / 2) this.x = this.width / 2;
    if (this.x > this.game.terrain.worldWidth - this.width / 2)
      this.x = this.game.terrain.worldWidth - this.width / 2;

    const groundY = this.game.terrain.getGroundY(this.x);
    if (this.y + this.height / 2 > groundY && this.velocityY >= 0) {
      this.y = groundY - this.height / 2;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    if (
      (input.keys.includes("w") || input.keys.includes(" ")) &&
      this.isGrounded
    ) {
      this.velocityY = this.jumpStrength;
      this.isGrounded = false;
    }

    const mouseXInWorld = mouse.x + this.game.camera.x;
    const mouseYInWorld = mouse.y;
    if (this.game.autoAimActive) {
      const closestEnemy = this.game.getClosestEnemy(this);
      if (closestEnemy) {
        this.staffAngle = Math.atan2(
          closestEnemy.y - this.y,
          closestEnemy.x - this.x
        );
      }
    } else {
      this.staffAngle = Math.atan2(
        mouseYInWorld - this.y,
        mouseXInWorld - this.x
      );
    }

    this.upgrades.atk_speed_up.timer += deltaTime;
    if (
      (this.game.isMouseDown || this.game.autoAimActive) &&
      this.upgrades.atk_speed_up.timer >= this.upgrades.atk_speed_up.value
    ) {
      this.shoot();
      this.upgrades.atk_speed_up.timer = 0;
    }
    if (this.isInvulnerable) {
      this.invulnerabilityTimer += deltaTime;
      if (this.invulnerabilityTimer > this.invulnerabilityDuration) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
      }
    }
    if (this.latchedParasites > 0) {
      this.parasiteDamageTimer += deltaTime;
      if (this.parasiteDamageTimer >= 3000) {
        const parasiteDamage = this.latchedParasites * (this.maxHealth * 0.01);
        this.takeDamage(parasiteDamage, true);
        this.parasiteDamageTimer = 0;
      }
      this.parasiteParticleTimer += deltaTime;
        if (this.parasiteParticleTimer >= this.parasiteParticleInterval) {
          // Usa this.game.createParticles para criar partículas de sangue
          this.game.createParticles(
            this.x, // Posição X do jogador
            this.y + this.height * 0.25, // Um pouco abaixo do centro do jogador, para simular escorrimento
            this.parasiteParticleColor, // Cor de sangue
            this.parasiteParticleCount // Quantidade de partículas
          );
          this.parasiteParticleTimer = 0; // Reseta o timer
        }
    }


    if (this.upgrades.lightningStrike.level > 0) {
      this.upgrades.lightningStrike.timer += deltaTime;
      if (
        this.upgrades.lightningStrike.timer >=
        this.upgrades.lightningStrike.cooldown
      ) {
        this.game.triggerLightningStrikes();
        this.upgrades.lightningStrike.timer = 0;
      }
    }
    this.updateSpeedBoosts(deltaTime);
    if (this.upgrades.temp_armor.timer > 0) {
      this.upgrades.temp_armor.timer -= deltaTime;
      if (this.upgrades.temp_armor.timer <= 0)
        this.upgrades.temp_armor.value = 0;
    }
    this.orbs.forEach((orb) => orb.update(deltaTime));
  }
  draw(context) {
    if (
      this.isInvulnerable &&
      !this.isParasitized() &&
      Math.floor(this.invulnerabilityTimer / 100) % 2 === 0
    )
      return;
    context.save();
    context.translate(this.x, this.y);
    if (this.isParasitized()) {
      context.globalAlpha = 0.7;
    }
    const bodyColor = this.isParasitized() ? "#5e8d63" : "#0077B6";
    const hatColor = "#90E0EF",
      staffColor = "#03045E",
      gemColor = "#CAF0F8";
    context.beginPath();
    context.moveTo(0, -this.height * 0.35);
    context.lineTo(-this.width / 2, this.height / 2);
    context.lineTo(this.width / 2, this.height / 2);
    context.closePath();
    context.strokeStyle = bodyColor;
    context.lineWidth = 1.5;
    context.stroke();
    context.beginPath();
    context.moveTo(0, -this.height * 0.9);
    context.lineTo(-this.width * 0.8, -this.height * 0.3);
    context.lineTo(this.width * 0.8, -this.height * 0.3);
    context.closePath();
    context.strokeStyle = hatColor;
    context.stroke();
    context.save();
    context.rotate(this.staffAngle);
    const staffLength = 15;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(staffLength, 0);
    context.strokeStyle = staffColor;
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(staffLength, 0, 2.5, 0, Math.PI * 2);
    context.strokeStyle = gemColor;
    context.fillStyle = gemColor;
    context.lineWidth = 1;
    context.stroke();
    context.fill();
    context.restore();
    if (this.upgrades.lethal_barrier.level > 0) {
      context.strokeStyle = "gold";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, this.width, 0, Math.PI * 2);
      context.stroke();
    } else if (this.upgrades.damage_barrier.level > 0) {
      context.strokeStyle = "cyan";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, this.width, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
    this.orbs.forEach((orb) => orb.draw(context));
  }
  shoot() {
    let damage = this.upgrades.projectileDamage.value;
    if (this.upgrades.stationary_damage.level > 0 && !this.isMoving) {
      damage *= 2;
    }
    this.game.projectiles.push(
      new Projectile(this.game, this.x, this.y, this.staffAngle, true, damage)
    );
  }
  takeDamage(damage, fromParasite = false) {
    let tempArmor = this.upgrades.temp_armor.value;
    if (this.isInvulnerable && !fromParasite) return;
    let finalDamage = fromParasite
      ? damage
      : damage - this.upgrades.armor_up.value - tempArmor;
    if (this.upgrades.damage_barrier.level > 0)
      finalDamage *= 1 - this.upgrades.damage_barrier.reduction;
    finalDamage = Math.max(1, finalDamage);

    if (
      this.health - finalDamage <= 0 &&
      this.upgrades.lethal_barrier.level > 0
    ) {
      this.upgrades.lethal_barrier.level = 0;
      this.isInvulnerable = true;
      this.invulnerabilityTimer = -1000;
      return;
    }
    this.health -= finalDamage;
    if (!fromParasite) {
      if (this.upgrades.thorns.level > 0)
        this.game.triggerThorns(this.x, this.y);
      this.isInvulnerable = true;
      this.game.triggerDamageVignette();
      this.game.triggerShake(150, 4);
    }
    if (this.health <= 0) {
      if (this.upgrades.revive.level > 0) {
        this.health = this.maxHealth * 0.25;
        this.upgrades.revive.level = 0;
      } else {
        this.health = 0;
        this.game.setGameOver();
      }
    }
  }
  onKill() {
    this.killCount++;
    if (this.upgrades.bloodthirst.level > 0) {
      // Verifica se o upgrade foi pego (nível > 0)
      this.upgrades.bloodthirst.currentKills++; // Incrementa o contador de kills do upgrade
      if (
        this.upgrades.bloodthirst.currentKills >=
        this.upgrades.bloodthirst.killsPerHeal
      ) {
        this.heal(this.upgrades.bloodthirst.healAmount); // Cura pela quantidade definida no upgrade
        this.upgrades.bloodthirst.currentKills = 0; // Reseta o contador de kills do upgrade
      }
    }
    if (this.upgrades.frenzy.level > 0) this.speedBoosts.push({ timer: 3000 });
  }
  updateSpeedBoosts(deltaTime) {
    let activeBoosts = 0;
    for (let i = this.speedBoosts.length - 1; i >= 0; i--) {
      this.speedBoosts[i].timer -= deltaTime;
      if (this.speedBoosts[i].timer <= 0) this.speedBoosts.splice(i, 1);
      else activeBoosts++;
    }
    const speedBonus = activeBoosts * this.upgrades.frenzy.speedPerStack;
    this.speed = this.baseSpeed + speedBonus;
  }
  isParasitized() {
    return this.latchedParasites > 0;
  }
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
  gainXP(amount) {
    if (this.game.gameState !== "running") return;
    this.xp += amount;
    if (this.xp >= this.xpToNextLevel) {
      this.levelUp();
    }
  }
  levelUp() {
    this.xp -= this.xpToNextLevel;
    this.level++;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    this.latchedParasites = 0;
    this.game.ui.showLevelUpFeedback(this.x, this.y);
    this.game.enterLevelUpState();
  }
  addOrb(type) {
    const angleOffset = this.orbs.length * ((Math.PI * 2) / 3);
    if (type === "shooter" && this.upgrades.shootingOrb.count < 3) {
      this.orbs.push(new ShootingOrb(this.game, this, angleOffset));
      this.upgrades.shootingOrb.count++;
    } else if (type === "laser" && this.upgrades.laserOrb.count < 1) {
      this.orbs.push(new LaserOrb(this.game, this, angleOffset));
      this.upgrades.laserOrb.count++;
    }
  }
}
