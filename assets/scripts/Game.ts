import {
	_decorator,
	Component,
	Node,
	Sprite,
	resources,
	SpriteFrame,
	UITransform,
	director,
	view,
	Size,
	RigidBody2D,
	BoxCollider2D,
	Contact2DType,
	ERigidBody2DType,
	Vec3,
	Vec2,
	input,
	Input,
	EventTouch,
	Label,
	Color
} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('Game')
export class Game extends Component {
	// 玩家
	private player: Node = new Node("player")
	private playerX: number = 0;
	private playerY: number = 0;
	/** 游戏状态 **/
	private _started: boolean = false;
	// 子弹开始时间
	private startBulletTime: number = 0;
	// 怪物开始时间
	private startMonsterTime: number = 0;
	/** 子弹间隔 **/
	private createBulletInterval: number = 1000;
	/** 怪物间隔 **/
	private createMonsterInterval: number = 3000;
	/** 得分 **/
	private score: number = 0
	private scoreTxt: Label;
	
	start() {
		// 创建背景图
		this.createBackground()
		// 创建玩家
		this.createPlayer()
		this._started = true
	}
	
	/**
	 * 创建背景图
	 */
	createBackground(): void {
		const bgNode = new Node("background");
		const canvasSize: Size = view.getVisibleSize();
		const uiTransform = bgNode.addComponent(UITransform);
		uiTransform.setContentSize(canvasSize.width, canvasSize.height)
		resources.load("apes/background/spriteFrame", SpriteFrame, (err, spriteFrame) => {
			if (err) {
				console.error('Failed to load texture:', err);
				return
			}
			const bgSpe = bgNode.addComponent(Sprite);
			bgSpe.spriteFrame = spriteFrame;
			// 确保背景图的尺寸符合 Canvas 尺寸
			let scaleX = canvasSize.width / uiTransform.width;
			let scaleY = canvasSize.height / uiTransform.height;
			bgNode.setScale(scaleX, scaleY);
			
			this.node.addChild(bgNode);
			bgNode.setPosition(0, 0);
			
			// 得分区域
			this.createScoreBox()
		})
	}
	
	/**
	 * 创建玩家
	 */
	createPlayer(): void {
		const canvasSize: Size = view.getVisibleSize();
		const playerSpe = this.player.addComponent(Sprite);
		resources.load("apes/airplane/spriteFrame", SpriteFrame, (err, spriteFrame) => {
			if (err) {
				console.error('Failed to load texture:', err);
				return
			}
			playerSpe.spriteFrame = spriteFrame;
			//添加刚体
			const rigidBody = this.player.addComponent(RigidBody2D);
			rigidBody.type = ERigidBody2DType.Kinematic;
			rigidBody.gravityScale = 0
			//添加碰撞体
			const collider = this.player.addComponent(BoxCollider2D);
			collider.size = new Size(102, 126);
			
			this.player.parent = this.node;
			this.player.setPosition(0, -canvasSize.height / 2 + 160)
			input.on(Input.EventType.TOUCH_MOVE, this.onPlayerMove, this);
		})
	}
	
	/**
	 * 操作玩家飞机
	 */
	onPlayerMove(event: EventTouch): void {
		if (!this.player) {
			return
		}
		// 获取鼠标在世界坐标系中的位置
		const touchPos = event.getUILocation();
		const uiTransform = this.node.getComponent(UITransform);
		// 将触摸位置转换为节点空间中的位置
		const localTouchPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
		const playerPos = this.player.getPosition();
		const direction = new Vec3();
		Vec3.subtract(direction, {x: localTouchPos.x, y: localTouchPos.y, z: 0}, playerPos);
		direction.normalize();
		direction.multiplyScalar(8);
		this.player.setPosition(playerPos.x + direction.x, playerPos.y + direction.y)
	}
	
	/**
	 * 创建子弹
	 */
	createBullet(): void {
		const bulletNode = new Node("bullet");
		resources.load("apes/bullet1/spriteFrame", SpriteFrame, (err, spriteFrame) => {
			if (err) {
				console.error('Failed to load texture:', err);
				return
			}
			const spe = bulletNode.addComponent(Sprite)
			spe.spriteFrame = spriteFrame;
			//添加刚体
			const rigidBody = bulletNode.addComponent(RigidBody2D);
			rigidBody.enabledContactListener = true;
			rigidBody.type = ERigidBody2DType.Kinematic;
			rigidBody.linearVelocity = new Vec2(0, 30)
			//添加碰撞体
			const collider = bulletNode.addComponent(BoxCollider2D);
			collider.size = new Size(5, 11);
			collider.on(Contact2DType.BEGIN_CONTACT, this.onBulletContact, this);
			bulletNode.parent = this.node;
			const playerPso = this.player.getPosition();
			bulletNode.setPosition(playerPso.x, playerPso.y);
		})
	}
	
	/**
	 * 子弹碰撞检测
	 * @param contact
	 * @param selfCollider
	 * @param otherCollider
	 */
	onBulletContact(selfCollider, otherCollider, contact) {}
	
	/***
	 * 敌机碰撞检测
	 * @param contact
	 * @param selfCollider
	 * @param otherCollider
	 */
	onMonsterContact(selfCollider, otherCollider, contact) {
		if (otherCollider?.node?.name === "bullet") { //子弹击中敌机
			// 需要在碰撞周期外销毁
			setTimeout(() => {
				this.updateScore();
				selfCollider?.node?.destroy();
			}, 10);
		} else if (otherCollider?.node?.name === "player") {
			this.stopGame()
		}
	}
	
	/**
	 * 随机生成敌机
	 */
	createMonster(): void {
		const canvasSize: Size = view.getVisibleSize();
		const monsterNode = new Node("monster")
		resources.load("apes/monster1/spriteFrame", SpriteFrame, (err, spriteFrame) => {
			if (err) {
				console.error('Failed to load texture:', err);
				return
			}
			const spe = monsterNode.addComponent(Sprite);
			spe.spriteFrame = spriteFrame;
			//添加刚体
			const rigidBody = monsterNode.addComponent(RigidBody2D);
			rigidBody.enabledContactListener = true;
			rigidBody.type = ERigidBody2DType.Dynamic;
			//添加碰撞体
			const collider = monsterNode.addComponent(BoxCollider2D);
			collider.size = new Size(57, 43);
			collider.on(Contact2DType.BEGIN_CONTACT, this.onMonsterContact, this);
			
			monsterNode.parent = this.node;
			const randomX = Math.random() * (canvasSize.width / 2 - (-canvasSize.width / 2)) + (-canvasSize.width / 2);
			monsterNode.setPosition(randomX, canvasSize.height / 2 - 100)
		})
	}
	
	/**
	 * 创建得分框
	 */
	createScoreBox(): void {
		const canvasSize: Size = view.getVisibleSize();
		const scoreNode = new Node("scoreBox");
		resources.load("apes/scoreLb/spriteFrame", SpriteFrame, (err, spriteFrame) => {
			if (err) {
				console.error('Failed to load texture:', err);
				return
			}
			const spe = scoreNode.addComponent(Sprite)
			spe.spriteFrame = spriteFrame;
			scoreNode.parent = this.node;
			scoreNode.setPosition(-canvasSize.width / 2 + 60, canvasSize.height / 2 - 80);
		})
		const scoreTxtNode = new Node("scoreTxt");
		this.scoreTxt = scoreTxtNode.addComponent(Label)
		this.scoreTxt.string = this.score + '';
		this.scoreTxt.color = Color.GRAY;
		scoreTxtNode.parent = this.node;
		scoreTxtNode.setPosition(-canvasSize.width / 2 + 120, canvasSize.height / 2 - 80);
	}
	
	/**
	 * 游戏失败，结算
	 */
	createFailedBox(): void{
		const node = new Node("Game Over");
		const failedTxt = node.addComponent(Label)
		failedTxt.string = "游戏失败,点击文字重新开始";
		failedTxt.color = Color.GRAY;
		node.parent = this.node;
		node.setPosition(0, 0);
		node.on(Node.EventType.TOUCH_START, this.startGame, this);
	}
	
	
	/**
	 * 分数更新
	 */
	updateScore(): void {
		this.score += 1;
		this.scoreTxt.string = this.score?.toString();
	}
	
	/**
	 * 开始游戏
	 */
	startGame(): void{
		// 创建背景图
		this.createBackground()
		// 创建玩家
		this.createPlayer()
		this._started = true
	}
	
	/**
	 * 结束当前游戏
	 */
	stopGame(): void {
		this._started = false;
		setTimeout(() =>{
			this.node.removeAllChildren();
			this.createFailedBox();
		}, 16)
	}
	
	/**
	 * 每帧更新
	 * @param deltaTime
	 */
	update(deltaTime: number) {
		let now = Date.now();
		if (now - this.startBulletTime > this.createBulletInterval && this._started) {
			this.startBulletTime = now;
			/** 创建子弹 **/
			this.createBullet();
		}
		if (now - this.startMonsterTime > this.createMonsterInterval && this._started) {
			this.startMonsterTime = now;
			/** 创建怪物飞机 */
			this.createMonster();
		}
	}
}


