/**
 * AI购物助手 - AR虚拟试穿/试戴模块
 * 支持眼镜、帽子、饰品、服装虚拟试穿
 */

export class ARTryOn {
  constructor() {
    this.isInitialized = false;
    this.videoStream = null;
    this.canvas = null;
    this.ctx = null;

    // 支持的试穿类型
    this.supportedTypes = {
      glasses: {
        name: '眼镜/墨镜',
        icon: '👓',
        facePoints: ['leftEye', 'rightEye', 'noseBridge'],
        adjustable: ['size', 'position']
      },
      hat: {
        name: '帽子',
        icon: '🎩',
        facePoints: ['forehead', 'headTop'],
        adjustable: ['size', 'position', 'tilt']
      },
      earrings: {
        name: '耳环',
        icon: '💎',
        facePoints: ['leftEar', 'rightEar'],
        adjustable: ['size']
      },
      necklace: {
        name: '项链',
        icon: '📿',
        facePoints: ['neck', 'shoulders'],
        adjustable: ['size', 'position']
      },
      watch: {
        name: '手表',
        icon: '⌚',
        bodyPoints: ['wrist'],
        adjustable: ['size']
      },
      lipstick: {
        name: '口红',
        icon: '💄',
        facePoints: ['lips'],
        adjustable: ['color', 'intensity']
      },
      hair: {
        name: '发型/假发',
        icon: '💇',
        facePoints: ['hairline', 'headShape'],
        adjustable: ['style', 'color']
      }
    };

    // 面部检测配置
    this.faceDetectionConfig = {
      maxFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    };
  }

  /**
   * 初始化AR模块
   */
  async initialize() {
    try {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持摄像头访问');
      }

      // 创建canvas
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 启动摄像头
   */
  async startCamera(videoElement) {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.videoStream;
      await videoElement.play();

      // 设置canvas尺寸
      this.canvas.width = videoElement.videoWidth;
      this.canvas.height = videoElement.videoHeight;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 停止摄像头
   */
  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
  }

  /**
   * 检测面部特征点
   */
  async detectFaceLandmarks(videoElement) {
    // 简化实现 - 实际需要使用 MediaPipe FaceMesh 或 TensorFlow.js
    // 这里返回模拟数据
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    return {
      detected: true,
      landmarks: {
        leftEye: { x: centerX - 60, y: centerY - 30 },
        rightEye: { x: centerX + 60, y: centerY - 30 },
        noseBridge: { x: centerX, y: centerY - 10 },
        noseTip: { x: centerX, y: centerY + 20 },
        leftEar: { x: centerX - 120, y: centerY },
        rightEar: { x: centerX + 120, y: centerY },
        lips: { x: centerX, y: centerY + 60 },
        chin: { x: centerX, y: centerY + 100 },
        forehead: { x: centerX, y: centerY - 80 },
        headTop: { x: centerX, y: centerY - 130 },
        neck: { x: centerX, y: centerY + 130 },
        faceWidth: 200,
        faceAngle: 0
      },
      confidence: 0.95
    };
  }

  /**
   * 应用虚拟试穿效果
   */
  async applyTryOn(videoElement, productImage, type, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 检测面部
    const faceData = await this.detectFaceLandmarks(videoElement);
    if (!faceData.detected) {
      return { success: false, error: '未检测到人脸，请正对摄像头' };
    }

    // 绘制视频帧
    this.ctx.drawImage(videoElement, 0, 0);

    // 根据类型应用效果
    switch (type) {
      case 'glasses':
        await this.applyGlasses(productImage, faceData.landmarks, options);
        break;
      case 'hat':
        await this.applyHat(productImage, faceData.landmarks, options);
        break;
      case 'earrings':
        await this.applyEarrings(productImage, faceData.landmarks, options);
        break;
      case 'lipstick':
        await this.applyLipstick(faceData.landmarks, options);
        break;
      default:
        await this.applyGeneric(productImage, faceData.landmarks, type, options);
    }

    return {
      success: true,
      canvas: this.canvas,
      dataUrl: this.canvas.toDataURL('image/png')
    };
  }

  /**
   * 应用眼镜效果
   */
  async applyGlasses(imageUrl, landmarks, options) {
    const img = await this.loadImage(imageUrl);

    // 计算眼镜位置和大小
    const eyeDistance = Math.sqrt(
      Math.pow(landmarks.rightEye.x - landmarks.leftEye.x, 2) +
      Math.pow(landmarks.rightEye.y - landmarks.leftEye.y, 2)
    );

    const scale = (options.size || 1) * (eyeDistance / img.width) * 2.5;
    const width = img.width * scale;
    const height = img.height * scale;

    const centerX = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
    const centerY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;

    // 计算旋转角度
    const angle = Math.atan2(
      landmarks.rightEye.y - landmarks.leftEye.y,
      landmarks.rightEye.x - landmarks.leftEye.x
    );

    // 绘制眼镜
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(angle);
    this.ctx.drawImage(img, -width / 2, -height / 2, width, height);
    this.ctx.restore();
  }

  /**
   * 应用帽子效果
   */
  async applyHat(imageUrl, landmarks, options) {
    const img = await this.loadImage(imageUrl);

    const scale = (options.size || 1) * (landmarks.faceWidth / img.width) * 1.5;
    const width = img.width * scale;
    const height = img.height * scale;

    const x = landmarks.headTop.x - width / 2;
    const y = landmarks.headTop.y - height * 0.7;

    this.ctx.save();
    if (options.tilt) {
      this.ctx.translate(landmarks.headTop.x, landmarks.headTop.y);
      this.ctx.rotate(options.tilt * Math.PI / 180);
      this.ctx.translate(-landmarks.headTop.x, -landmarks.headTop.y);
    }
    this.ctx.drawImage(img, x, y, width, height);
    this.ctx.restore();
  }

  /**
   * 应用耳环效果
   */
  async applyEarrings(imageUrl, landmarks, options) {
    const img = await this.loadImage(imageUrl);

    const scale = (options.size || 1) * 0.3;
    const width = img.width * scale;
    const height = img.height * scale;

    // 左耳环
    this.ctx.drawImage(
      img,
      landmarks.leftEar.x - width / 2,
      landmarks.leftEar.y,
      width,
      height
    );

    // 右耳环（水平翻转）
    this.ctx.save();
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(
      img,
      -(landmarks.rightEar.x + width / 2),
      landmarks.rightEar.y,
      width,
      height
    );
    this.ctx.restore();
  }

  /**
   * 应用口红效果
   */
  async applyLipstick(landmarks, options) {
    const color = options.color || '#cc3366';
    const intensity = options.intensity || 0.6;

    // 简化实现 - 实际需要精确的唇部轮廓
    this.ctx.save();
    this.ctx.globalAlpha = intensity;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(
      landmarks.lips.x,
      landmarks.lips.y,
      30,
      12,
      0,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * 通用产品叠加
   */
  async applyGeneric(imageUrl, landmarks, type, options) {
    const img = await this.loadImage(imageUrl);
    const config = this.supportedTypes[type];

    if (!config) return;

    const scale = options.size || 1;
    const width = img.width * scale;
    const height = img.height * scale;

    // 根据类型确定位置
    let x, y;
    if (type === 'necklace') {
      x = landmarks.neck.x - width / 2;
      y = landmarks.neck.y - height / 4;
    } else {
      x = landmarks.noseTip.x - width / 2;
      y = landmarks.noseTip.y - height / 2;
    }

    this.ctx.drawImage(img, x, y, width, height);
  }

  /**
   * 加载图片
   */
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * 拍照保存
   */
  async capturePhoto() {
    if (!this.canvas) return null;

    return {
      dataUrl: this.canvas.toDataURL('image/png'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 创建对比图
   */
  async createComparisonImage(originalVideo, products) {
    const compCanvas = document.createElement('canvas');
    const compCtx = compCanvas.getContext('2d');

    const itemWidth = 300;
    const itemHeight = 400;
    const cols = Math.min(products.length + 1, 4);

    compCanvas.width = itemWidth * cols;
    compCanvas.height = itemHeight;

    // 绘制原始照片
    compCtx.drawImage(originalVideo, 0, 0, itemWidth, itemHeight);
    compCtx.fillStyle = 'white';
    compCtx.fillRect(0, itemHeight - 30, itemWidth, 30);
    compCtx.fillStyle = 'black';
    compCtx.font = '14px sans-serif';
    compCtx.textAlign = 'center';
    compCtx.fillText('原图', itemWidth / 2, itemHeight - 10);

    // 绘制各产品试穿效果
    for (let i = 0; i < products.length && i < cols - 1; i++) {
      const product = products[i];
      const x = (i + 1) * itemWidth;

      // 应用效果并绘制
      const result = await this.applyTryOn(
        originalVideo,
        product.image,
        product.type,
        product.options
      );

      if (result.success) {
        compCtx.drawImage(result.canvas, x, 0, itemWidth, itemHeight);
      }

      // 添加标签
      compCtx.fillStyle = 'white';
      compCtx.fillRect(x, itemHeight - 30, itemWidth, 30);
      compCtx.fillStyle = 'black';
      compCtx.fillText(product.name, x + itemWidth / 2, itemHeight - 10);
    }

    return compCanvas.toDataURL('image/png');
  }

  /**
   * 检查产品是否支持AR试穿
   */
  checkProductSupport(productTitle, productCategory) {
    const keywords = {
      glasses: ['眼镜', '墨镜', '太阳镜', '近视镜', '防蓝光'],
      hat: ['帽子', '帽', '鸭舌帽', '棒球帽', '贝雷帽', '渔夫帽'],
      earrings: ['耳环', '耳钉', '耳坠', '耳饰'],
      necklace: ['项链', '吊坠', '锁骨链', '颈链'],
      watch: ['手表', '腕表', '智能手表'],
      lipstick: ['口红', '唇膏', '唇釉', '唇彩'],
      hair: ['假发', '发套', '接发', '发片']
    };

    const title = productTitle.toLowerCase();

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => title.includes(word))) {
        return {
          supported: true,
          type,
          typeInfo: this.supportedTypes[type]
        };
      }
    }

    return { supported: false };
  }

  /**
   * 生成AR试穿UI
   */
  generateTryOnUI(containerId, product) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="ar-tryon-container">
        <div class="ar-video-wrapper">
          <video id="ar-video" autoplay playsinline></video>
          <canvas id="ar-canvas"></canvas>
          <div class="ar-controls">
            <button id="ar-capture" class="ar-btn">📷 拍照</button>
            <button id="ar-toggle" class="ar-btn">🔄 切换</button>
          </div>
        </div>
        <div class="ar-adjustments">
          <label>大小调整:
            <input type="range" id="ar-size" min="0.5" max="2" step="0.1" value="1">
          </label>
          <label>位置调整:
            <input type="range" id="ar-position" min="-50" max="50" step="1" value="0">
          </label>
        </div>
        <div class="ar-gallery" id="ar-gallery"></div>
      </div>
    `;

    return container;
  }

  /**
   * 获取支持的产品类型
   */
  getSupportedTypes() {
    return Object.entries(this.supportedTypes).map(([key, value]) => ({
      id: key,
      ...value
    }));
  }
}
