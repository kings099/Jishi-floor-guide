import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  MapPin,
  Save,
  Eye,
  EyeOff,
  Search,
  X,
  Settings,
  Home,
  Layers,
  Upload,
  Image,
  Edit3,
  Camera,
  Tag,
  Plus,
  Zap,
  Users
} from "lucide-react";

// 类型定义
type Room = {
  id: string;
  name: string;
  description: string;
  type: string;
  coordinates: { 
    x: number;  // 现在表示相对位置（百分比），范围0-100
    y: number;  // 现在表示相对位置（百分比），范围0-100
  };
  photos?: string[];
  tags?: string[];
};

// 常量配置
const ROOM_TYPES = {
  classroom: { icon: Layers, color: 'bg-blue-500', label: '教室' },
  office: { icon: Home, color: 'bg-emerald-500', label: '办公室' },
  lab: { icon: Zap, color: 'bg-orange-500', label: '实验室' },
  meeting: { icon: Users, color: 'bg-red-500', label: '会议室' },
  other: { icon: MapPin, color: 'bg-purple-500', label: '其他' }
} as const;

const FALLBACK_ROOMS: Room[] = [];
const imageUrl = `${import.meta.env.BASE_URL}floor.jpg`;

// 公共样式
const commonStyles = {
  button: "px-4 py-2 rounded-lg transition-all duration-200",
  input: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  card: "bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
};

export default function FloorGuide() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [rooms, setRooms] = useState<Room[]>(FALLBACK_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(() => new URLSearchParams(window.location.search).get("dev") === "1");
  
  // 简化标签显示状态管理
  const [showLabels, setShowLabels] = useState(true);
  // 使用ref保存最新的标签状态，避免闭包问题
  const showLabelsRef = useRef(true);
  
  // 添加地图尺寸状态跟踪
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  
  // 添加标签风格状态，true表示固定位置，false表示浮动位置
  const [fixedLabels, setFixedLabels] = useState(false);
  
  // 添加图片实际尺寸和位置的状态
  const [imageRect, setImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // 添加图片原始尺寸
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  
  // 更新标签状态的处理函数
  const toggleLabels = () => {
    const newValue = !showLabels;
    console.log(`切换标签显示状态: ${newValue ? '显示' : '隐藏'}`);
    showLabelsRef.current = newValue;
    setShowLabels(newValue);
  };

  // 切换标签风格的函数
  const toggleLabelStyle = () => {
    const newValue = !fixedLabels;
    console.log(`切换标签风格: ${newValue ? '固定位置' : '浮动位置'}`);
    setFixedLabels(newValue);
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const forceRerender = () => setRenderCount(prev => prev + 1);

  // 监控标签显示状态的变化
  useEffect(() => {
    console.log(`标签显示状态变化: ${showLabels ? '显示' : '隐藏'} (render ${renderCount})`);
    // 同步ref值
    showLabelsRef.current = showLabels;
  }, [showLabels, renderCount]);

  // 添加一个辅助函数，将房间的绝对坐标转换为相对坐标
  const convertToRelativeCoordinates = useCallback(() => {
    if (!mapRef.current || mapSize.width === 0 || mapSize.height === 0) {
      console.log('地图尚未准备好，无法转换坐标');
      return;
    }

    console.log('开始转换坐标系统...');
    const mapWidth = mapSize.width;
    const mapHeight = mapSize.height;
    
    setRooms((currentRooms) => {
      return currentRooms.map(room => {
        // 检查坐标是否已经是相对坐标（0-100范围）
        if (room.coordinates.x <= 100 && room.coordinates.y <= 100) {
          return room; // 已经是相对坐标，无需转换
        }
        
        // 转换为相对坐标
        const x = (room.coordinates.x / mapWidth) * 100;
        const y = (room.coordinates.y / mapHeight) * 100;
        
        return {
          ...room,
          coordinates: {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          }
        };
      });
    });
    
    console.log('坐标转换完成');
  }, [mapSize]);
  
  // 添加窗口尺寸变化监听
  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        setMapSize({ width: rect.width, height: rect.height });
        console.log(`地图尺寸更新: ${rect.width}x${rect.height}`);
        
        // 更新图片实际尺寸和位置
        updateImageRect();
      }
    };
    
    // 更新图片实际尺寸和位置的函数
    const updateImageRect = () => {
      if (imageRef.current && mapRef.current && imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
        const imgElement = imageRef.current;
        const mapRect = mapRef.current.getBoundingClientRect();
        
        // 容器的宽高
        const containerWidth = mapRect.width;
        const containerHeight = mapRect.height;
        
        // 计算图片在保持纵横比的情况下的实际尺寸
        const imgRatio = imageNaturalSize.width / imageNaturalSize.height;
        const containerRatio = containerWidth / containerHeight;
        
        let actualWidth, actualHeight;
        
        if (imgRatio > containerRatio) {
          // 图片更宽，将以宽度为限制
          actualWidth = containerWidth;
          actualHeight = containerWidth / imgRatio;
        } else {
          // 图片更高，将以高度为限制
          actualHeight = containerHeight;
          actualWidth = containerHeight * imgRatio;
        }
        
        // 计算图片在容器中居中后的偏移量
        const offsetX = (containerWidth - actualWidth) / 2;
        const offsetY = (containerHeight - actualHeight) / 2;
        
        // 更新图片实际渲染区域信息
        setImageRect({
          x: offsetX,
          y: offsetY,
          width: actualWidth,
          height: actualHeight
        });
        
        console.log(`图片实际尺寸更新: ${actualWidth.toFixed(0)}x${actualHeight.toFixed(0)}, 位置: (${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`);
        console.log(`容器尺寸: ${containerWidth}x${containerHeight}, 图片原始尺寸: ${imageNaturalSize.width}x${imageNaturalSize.height}`);
      }
    };

    // 初始化
    updateMapSize();

    // 监听窗口大小变化
    window.addEventListener('resize', updateMapSize);
    
    // 创建ResizeObserver监听地图容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      updateMapSize();
      updateImageRect();
    });
    
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateMapSize);
      resizeObserver.disconnect();
    };
  }, [imageNaturalSize.width, imageNaturalSize.height]);
  
  // 首次加载房间数据后，执行一次坐标转换
  useEffect(() => {
    if (rooms.length > 0 && mapSize.width > 0) {
      convertToRelativeCoordinates();
    }
  }, [rooms.length, mapSize.width > 0, convertToRelativeCoordinates]);

  // 工具函数
  const getRoomTypeInfo = (type: string) => ROOM_TYPES[type as keyof typeof ROOM_TYPES] || ROOM_TYPES.other;
  const getRoomColor = (type: string) => getRoomTypeInfo(type).color;
  const getRoomIcon = (type: string) => {
    const Icon = getRoomTypeInfo(type).icon;
    return <Icon size={14} />;
  };

  // 加载房间数据
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}rooms.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setRooms(data))
      .catch(() => {/* ignore */});
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDevMode((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleLabels();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // 过滤房间
  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q ? rooms : rooms.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  }, [rooms, query]);

  // 房间操作函数
  const addNewRoom = (x: number, y: number) => {
    // 将传入的x和y坐标值视为像素坐标，需要转换为相对坐标
    const percentX = mapSize.width > 0 ? (x / mapSize.width) * 100 : 50;
    const percentY = mapSize.height > 0 ? (y / mapSize.height) * 100 : 50;
    
    const newRoom: Room = {
      id: `room_${Date.now()}`,
      name: "新房间",
      description: "请编辑描述",
      type: "other",
      coordinates: { 
        x: Math.max(0, Math.min(100, percentX)),  // 确保在0-100范围内
        y: Math.max(0, Math.min(100, percentY))   // 确保在0-100范围内
      },
    };
    setRooms((rs) => [...rs, newRoom]);
    setSelectedRoom(newRoom);
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms((rs) => rs.map((r) => (r.id === roomId ? { ...r, ...updates } : r)));
  };

  const handlePhotoUpload = (roomId: string, files: FileList) => {
    console.log(`处理上传照片，房间ID: ${roomId}，文件数量: ${files.length}`);
    
    Array.from(files).forEach((file, i) => {
      console.log(`处理第 ${i+1} 个文件: ${file.name}，类型: ${file.type}`);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          console.log(`文件 ${i+1} 读取完成`);
          const photoUrl = event.target?.result as string;
          
          if (photoUrl) {
            console.log(`照片URL生成成功，长度: ${photoUrl.length}`);
            
            // 更新全局rooms状态
            setRooms(prevRooms => {
              console.log(`更新rooms状态`);
              const updatedRooms = prevRooms.map(room => {
                if (room.id === roomId) {
                  const updatedRoom = {
                    ...room,
                    photos: [...(room.photos || []), photoUrl]
                  };
                  console.log(`房间照片更新成功，现有照片数量: ${updatedRoom.photos.length}`);
                  return updatedRoom;
                }
                return room;
              });
              return updatedRooms;
            });
            
            // 更新editingRoom状态
            setEditingRoom(prevRoom => {
              if (prevRoom && prevRoom.id === roomId) {
                console.log(`更新editingRoom状态`);
                const updatedEditingRoom = {
                  ...prevRoom,
                  photos: [...(prevRoom.photos || []), photoUrl]
                };
                console.log(`编辑中的房间照片更新成功，现有照片数量: ${updatedEditingRoom.photos.length}`);
                return updatedEditingRoom;
              }
              return prevRoom;
            });
          }
        };
        
        reader.onerror = () => {
          console.error(`文件 ${file.name} 读取失败`);
        };
        
        console.log(`开始读取文件 ${file.name}`);
        reader.readAsDataURL(file);
      } else {
        console.log(`文件 ${file.name} 不是图片，跳过`);
      }
    });
  };

  // 保存配置
  const saveRooms = () => {
    const dataStr = JSON.stringify(rooms, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rooms.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 拖拽时处理坐标转换的辅助函数
  const mapMouseToImagePercent = (clientX: number, clientY: number) => {
    if (!imageRef.current || imageRect.width === 0) return { x: 50, y: 50 };
    
    // 图片的实际渲染区域
    const imgRect = {
      left: mapRef.current!.getBoundingClientRect().left + imageRect.x,
      top: mapRef.current!.getBoundingClientRect().top + imageRect.y,
      width: imageRect.width,
      height: imageRect.height
    };
    
    // 确保鼠标在图片范围内
    const boundedX = Math.max(imgRect.left, Math.min(imgRect.left + imgRect.width, clientX));
    const boundedY = Math.max(imgRect.top, Math.min(imgRect.top + imgRect.height, clientY));
    
    // 转换为图片上的相对位置 (0-100%)
    const percentX = ((boundedX - imgRect.left) / imgRect.width) * 100;
    const percentY = ((boundedY - imgRect.top) / imgRect.height) * 100;
    
    return {
      x: Math.max(0, Math.min(100, percentX)),
      y: Math.max(0, Math.min(100, percentY))
    };
  };

  // 更新onPointerMove事件处理函数
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !mapRef.current || !imageRef.current) return;
    
    // 使用辅助函数将鼠标位置映射到图片百分比坐标
    const { x: percentX, y: percentY } = mapMouseToImagePercent(e.clientX, e.clientY);
    
    // 更新房间状态，使用百分比坐标
    setRooms((rs) => rs.map((r) => 
      r.id === draggingId ? { 
        ...r, 
        coordinates: { x: percentX, y: percentY } 
      } : r
    ));
  };

  // 渲染函数
  const renderRoomPin = (room: Room) => {
    const isSelected = selectedRoom?.id === room.id;
    const isHovered = hoveredRoom === room.id;
    const shouldShowLabel = showLabelsRef.current && (isSelected || isHovered);
    
    // 首先确保图片已正确加载并测量
    if (imageRect.width === 0 || imageRect.height === 0) {
      // 如果图片尺寸未加载，使用容器尺寸的估计值
      // 计算相对坐标转换为实际像素位置（相对于容器）
      const pixelX = (room.coordinates.x / 100) * mapSize.width;
      const pixelY = (room.coordinates.y / 100) * mapSize.height;
      
      // 根据房间位置计算最佳标签显示位置
      const labelPosition = {
        isRight: room.coordinates.x < 80, // 房间位于地图左侧80%区域时，标签显示在右侧
        isBottom: room.coordinates.y < 50, // 房间位于地图上半部分时，标签显示在下方
      };
      
      return (
        <div
          key={room.id}
          style={{
            left: pixelX,
            top: pixelY,
            position: "absolute",
            transform: "translate(-50%, -50%)",
          }}
          className="group"
        >
          <button
            className={`relative ${getRoomColor(room.type)} w-10 h-10 rounded-full border-3 border-white shadow-xl 
              flex items-center justify-center transition-all duration-300 
              hover:scale-125 hover:shadow-2xl 
              ${isSelected ? 'scale-125 shadow-2xl ring-4 ring-blue-300/50' : ''} 
              ${isHovered ? 'scale-110' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRoom(room);
            }}
            onPointerDown={devMode ? (e) => {
              e.stopPropagation();
              setDraggingId(room.id);
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            } : undefined}
            onPointerMove={devMode ? handlePointerMove : undefined}
            onPointerUp={devMode ? () => setDraggingId(null) : undefined}
            onMouseEnter={() => setHoveredRoom(room.id)}
            onMouseLeave={() => setHoveredRoom(null)}
          >
            <div className="text-white">{getRoomIcon(room.type)}</div>
            <div className={`absolute inset-0 ${getRoomColor(room.type)} rounded-full animate-ping opacity-20`}></div>
            {room.photos?.length && (
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <div className="w-3 h-3 bg-green-400 rounded-full border border-white flex items-center justify-center">
                  <Camera size={8} className="text-white" />
                </div>
              </div>
            )}
          </button>
          
          {shouldShowLabel && (
            <div 
              className={`absolute px-3 py-2 
                bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-sm whitespace-nowrap border border-gray-200/50 
                transition-all duration-300 z-50
                ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}`}
              style={fixedLabels ? {
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginLeft: '0.75rem',
                maxWidth: '200px',
                zIndex: 10
              } : {
                position: 'absolute',
                ...(labelPosition.isRight
                  ? { left: 'calc(100% + 0.75rem)' }
                  : { right: 'calc(100% + 0.75rem)' }),
                ...(labelPosition.isBottom
                  ? { top: 'calc(100% + 0.75rem)' }
                  : { bottom: 'calc(100% + 0.75rem)' }),
                transform: 'none',
                maxWidth: '200px',
                zIndex: 10,
              }}
            >
              {!fixedLabels && (
                <div
                  className="absolute w-2 h-2 bg-white rotate-45 border border-gray-200/50"
                  style={{
                    ...(labelPosition.isRight
                      ? { left: -4, borderRight: 'none', borderTop: 'none' }
                      : { right: -4, borderLeft: 'none', borderBottom: 'none' }),
                    ...(labelPosition.isBottom
                      ? { top: -4, borderBottom: 'none', borderLeft: 'none' }
                      : { bottom: -4, borderTop: 'none', borderRight: 'none' }),
                  }}
                ></div>
              )}
              <div className="font-medium text-gray-900">{room.name}</div>
              {room.description && (
                <div className="text-xs text-gray-500 max-w-48 truncate">{room.description}</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // 计算房间点在实际图片上的位置（相对于图片的百分比）
    // 然后将百分比转换为实际像素位置（考虑图片在容器中的位置和大小）
    const pixelX = imageRect.x + ((room.coordinates.x / 100) * imageRect.width);
    const pixelY = imageRect.y + ((room.coordinates.y / 100) * imageRect.height);
    
    // 检测周围是否有其他点位，用于更智能地放置标签
    const getSmartLabelPosition = () => {
      // 优先级：右、左、下、上，最后在四个角落
      const positions = ['right', 'left', 'bottom', 'top', 'topright', 'topleft', 'bottomright', 'bottomleft'];
      
      // 定义标签在各个位置时的基础方向属性
      const basePositionProps = {
        right: { isRight: true, isBottom: null },
        left: { isRight: false, isBottom: null },
        bottom: { isRight: null, isBottom: true },
        top: { isRight: null, isBottom: false },
        topright: { isRight: true, isBottom: false },
        topleft: { isRight: false, isBottom: false },
        bottomright: { isRight: true, isBottom: true },
        bottomleft: { isRight: false, isBottom: true }
      };
      
      // 检查当前房间点与其他房间点的距离
      const nearbyRooms = rooms.filter(r => 
        r.id !== room.id && 
        // 计算当前点位和其他点位的距离
        Math.sqrt(
          Math.pow((r.coordinates.x - room.coordinates.x) / 100 * imageRect.width, 2) + 
          Math.pow((r.coordinates.y - room.coordinates.y) / 100 * imageRect.height, 2)
        ) < 150 // 150px作为阈值
      );
      
      // 标记每个方向是否被占用
      const blockedDirections = {
        right: false,
        left: false,
        bottom: false,
        top: false,
        topright: false,
        topleft: false,
        bottomright: false,
        bottomleft: false
      };
      
      // 检查每个附近的房间是否会阻挡某个方向
      nearbyRooms.forEach(nearbyRoom => {
        const nearbyX = (nearbyRoom.coordinates.x - room.coordinates.x) / 100 * imageRect.width;
        const nearbyY = (nearbyRoom.coordinates.y - room.coordinates.y) / 100 * imageRect.height;
        
        // 根据相对位置判断被阻挡的方向
        if (nearbyX > 30 && Math.abs(nearbyY) < 30) blockedDirections.right = true;
        if (nearbyX < -30 && Math.abs(nearbyY) < 30) blockedDirections.left = true;
        if (nearbyY > 30 && Math.abs(nearbyX) < 30) blockedDirections.bottom = true;
        if (nearbyY < -30 && Math.abs(nearbyX) < 30) blockedDirections.top = true;
        
        // 检查对角线方向
        if (nearbyX > 30 && nearbyY < -30) blockedDirections.topright = true;
        if (nearbyX < -30 && nearbyY < -30) blockedDirections.topleft = true;
        if (nearbyX > 30 && nearbyY > 30) blockedDirections.bottomright = true;
        if (nearbyX < -30 && nearbyY > 30) blockedDirections.bottomleft = true;
      });
      
      // 检查房间点是否靠近图片边缘
      const edgePadding = 50; // 边缘安全距离(px)
      if (pixelX + edgePadding > imageRect.x + imageRect.width) blockedDirections.right = true;
      if (pixelX - edgePadding < imageRect.x) blockedDirections.left = true;
      if (pixelY + edgePadding > imageRect.y + imageRect.height) blockedDirections.bottom = true;
      if (pixelY - edgePadding < imageRect.y) blockedDirections.top = true;
      
      // 根据优先级选择第一个未被阻挡的方向
      const availablePosition = positions.find(pos => !blockedDirections[pos]) || 'right';
      
      return {
        position: availablePosition,
        ...basePositionProps[availablePosition]
      };
    };
    
    // 获取智能标签位置
    const smartPosition = getSmartLabelPosition();
    
    // 根据房间位置计算最佳标签显示位置
    const labelPosition = fixedLabels 
      ? { // 固定模式下：永远固定在右侧
          isRight: true, 
          isBottom: null
        } 
      : { // 智能模式下：使用智能定位算法
          isRight: smartPosition.isRight, 
          isBottom: smartPosition.isBottom
        };
    
    // 计算标签的自定义样式
    const getLabelStyle = () => {
      if (fixedLabels) {
        // 固定位置风格：标签紧随地图但固定在右侧
        return {
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '0.75rem',
          maxWidth: '200px',
          zIndex: 10
        };
      } else {
        // 智能浮动风格：根据计算的最佳位置放置标签
        let style: React.CSSProperties = {
          position: 'absolute',
          maxWidth: '200px',
          zIndex: 10,
        };
        
        // 基于isRight和isBottom设置位置
        if (labelPosition.isRight === true) {
          style.left = 'calc(100% + 0.75rem)';
        } else if (labelPosition.isRight === false) {
          style.right = 'calc(100% + 0.75rem)';
        }
        
        if (labelPosition.isBottom === true) {
          style.top = 'calc(100% + 0.75rem)';
        } else if (labelPosition.isBottom === false) {
          style.bottom = 'calc(100% + 0.75rem)';
        }
        
        // 如果是角落位置，需要调整transform以避免对角线方向的偏移
        if (labelPosition.isRight !== null && labelPosition.isBottom !== null) {
          style.transform = 'none';
        }
        
        // 处理居中的情况
        if (labelPosition.isRight === null) {
          style.left = '50%';
          style.transform = 'translateX(-50%)';
        }
        
        if (labelPosition.isBottom === null) {
          style.top = '50%';
          style.transform = (style.transform || '') + ' translateY(-50%)';
        }
        
        return style;
      }
    };
    
    // 计算小箭头的位置和样式
    const getArrowStyle = () => {
      if (labelPosition.isRight === null && labelPosition.isBottom === null) {
        return {}; // 完全居中时不显示箭头
      }
      
      let style: React.CSSProperties = {
        position: 'absolute',
        width: '8px',
        height: '8px',
        backgroundColor: 'white',
        transform: 'rotate(45deg)',
        border: '1px solid rgba(209, 213, 219, 0.5)',
      };
      
      // 根据标签位置设置箭头位置
      if (labelPosition.isRight === true) {
        style.left = '-4px';
        style.borderRight = 'none';
        style.borderTop = 'none';
      } else if (labelPosition.isRight === false) {
        style.right = '-4px';
        style.borderLeft = 'none';
        style.borderBottom = 'none';
      }
      
      if (labelPosition.isBottom === true) {
        style.top = '-4px';
        style.borderBottom = 'none';
        style.borderLeft = 'none';
      } else if (labelPosition.isBottom === false) {
        style.bottom = '-4px';
        style.borderTop = 'none';
        style.borderRight = 'none';
      }
      
      // 处理角落位置
      if (labelPosition.isRight !== null && labelPosition.isBottom !== null) {
        if (labelPosition.isRight && labelPosition.isBottom) { // 右下角
          style.left = '-4px';
          style.top = '-4px';
          style.borderRight = 'none';
          style.borderBottom = 'none';
        } else if (labelPosition.isRight && !labelPosition.isBottom) { // 右上角
          style.left = '-4px';
          style.bottom = '-4px';
          style.borderRight = 'none';
          style.borderTop = 'none';
        } else if (!labelPosition.isRight && labelPosition.isBottom) { // 左下角
          style.right = '-4px';
          style.top = '-4px';
          style.borderLeft = 'none';
          style.borderBottom = 'none';
        } else if (!labelPosition.isRight && !labelPosition.isBottom) { // 左上角
          style.right = '-4px';
          style.bottom = '-4px';
          style.borderLeft = 'none';
          style.borderTop = 'none';
        }
      }
      
      return style;
    };
    
    return (
      <div
        key={room.id}
        style={{
          left: pixelX,
          top: pixelY,
          position: "absolute",
          transform: "translate(-50%, -50%)",
        }}
        className="group"
      >
        <button
          className={`relative ${getRoomColor(room.type)} w-10 h-10 rounded-full border-3 border-white shadow-xl 
            flex items-center justify-center transition-all duration-300 
            hover:scale-125 hover:shadow-2xl 
            ${isSelected ? 'scale-125 shadow-2xl ring-4 ring-blue-300/50' : ''} 
            ${isHovered ? 'scale-110' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRoom(room);
          }}
          onPointerDown={devMode ? (e) => {
            e.stopPropagation();
            setDraggingId(room.id);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          } : undefined}
          onPointerMove={devMode ? handlePointerMove : undefined}
          onPointerUp={devMode ? () => setDraggingId(null) : undefined}
          onMouseEnter={() => setHoveredRoom(room.id)}
          onMouseLeave={() => setHoveredRoom(null)}
        >
          <div className="text-white">{getRoomIcon(room.type)}</div>
          <div className={`absolute inset-0 ${getRoomColor(room.type)} rounded-full animate-ping opacity-20`}></div>
          {room.photos?.length && (
            <div className="absolute -top-1 -right-1 flex gap-0.5">
              <div className="w-3 h-3 bg-green-400 rounded-full border border-white flex items-center justify-center">
                <Camera size={8} className="text-white" />
              </div>
            </div>
          )}
        </button>

        {shouldShowLabel && (
          <div 
            className={`absolute px-3 py-2 
              bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-sm whitespace-nowrap border border-gray-200/50 
              transition-all duration-300 z-50
              ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}`}
            style={getLabelStyle()}
          >
            {!fixedLabels && (
              <div
                className="absolute bg-white rotate-45 border border-gray-200/50"
                style={getArrowStyle()}
              ></div>
            )}
            <div className="font-medium text-gray-900">{room.name}</div>
            {room.description && (
              <div className="text-xs text-gray-500 max-w-48 truncate">{room.description}</div>
            )}
            {devMode && !fixedLabels && (
              <div className="mt-1 text-xs text-gray-400">位置: {smartPosition.position}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <MapPin size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    济事楼4楼导览
                  </h1>
                  <p className="text-sm text-gray-500">共 {rooms.length} 个位置点</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {devMode && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                  <Settings size={14} />
                  开发者模式
                </div>
              )}

              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索房间、设施或标签..."
                  className={`${commonStyles.input} pl-9`}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}

                {query && filteredRooms.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 max-h-[300px] overflow-y-auto z-50">
                    <div className="p-2">
                      {filteredRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => {
                            setSelectedRoom(room);
                            setQuery("");
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                        >
                          <div className={`w-8 h-8 ${getRoomColor(room.type)} rounded-lg flex items-center justify-center text-white shadow-sm`}>
                            {getRoomIcon(room.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {room.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {room.description}
                            </div>
                            {room.tags && room.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {room.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {query && filteredRooms.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 p-4 text-center text-gray-500">
                    <Search size={20} className="mx-auto mb-2 opacity-50" />
                    <p>未找到匹配的结果</p>
                    <p className="text-sm mt-1">尝试其他关键词</p>
                  </div>
                )}
              </div>

              <button
                className={`${commonStyles.button} flex items-center gap-2 bg-white/50 hover:bg-white/80 text-gray-700 hover:text-gray-900`}
                onClick={() => {
                  toggleLabels();
                  forceRerender();
                }}
                style={{
                  backgroundColor: showLabels ? 'rgba(255,255,255,0.5)' : 'rgba(200,200,255,0.9)'
                }}
              >
                {showLabels ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="hidden sm:inline">{showLabels ? "隐藏标签" : "显示标签"}</span>
              </button>

              {/* 添加标签风格切换按钮 */}
              {showLabels && (
                <button
                  className={`${commonStyles.button} flex items-center gap-2 text-gray-700 hover:text-gray-900 relative group`}
                  onClick={toggleLabelStyle}
                  style={{
                    backgroundColor: fixedLabels ? 'rgba(186,230,253,0.8)' : 'rgba(255,255,255,0.5)',
                    borderLeft: fixedLabels ? '3px solid rgb(14,165,233)' : 'none',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <Tag size={16} className={fixedLabels ? 'text-blue-500' : 'text-gray-600'} />
                  <span className="hidden sm:inline">{fixedLabels ? "智能标签" : "固定标签"}</span>
                  
                  {/* 添加悬停提示 */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none min-w-[200px] max-w-[300px]">
                    <div className="font-medium mb-1">标签显示模式：{fixedLabels ? "智能浮动" : "固定位置"}</div>
                    <div className="text-gray-300 text-xs">
                      {fixedLabels 
                        ? "点击切换到固定位置模式" 
                        : "点击切换到智能浮动模式"}
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-gray-800"></div>
                  </div>
                </button>
              )}

              {devMode && (
                <button
                  className={`${commonStyles.button} flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25`}
                  onClick={saveRooms}
                >
                  <Save size={16} />
                  <span className="hidden sm:inline">导出配置</span>
                </button>
              )}

              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative h-[calc(100vh-73px)]">
        {/* Debug Panel */}
        {devMode && (
          <div className="absolute top-4 right-4 z-50 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 text-xs">
            <div className="font-bold mb-1">调试信息</div>
            <div className={showLabels ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              标签显示状态: {showLabels ? '显示✓' : '隐藏✗'}
            </div>
            <div>Ref值: {showLabelsRef.current ? '显示' : '隐藏'}</div>
            <div>渲染次数: {renderCount}</div>
            <div>选中房间: {selectedRoom?.name || '无'}</div>
            <div>悬停房间: {hoveredRoom ? rooms.find(r => r.id === hoveredRoom)?.name : '无'}</div>
            
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="font-bold">地图信息</div>
              <div>容器尺寸: {mapSize.width.toFixed(0)}×{mapSize.height.toFixed(0)}px</div>
              <div>图片尺寸: {imageRect.width.toFixed(0)}×{imageRect.height.toFixed(0)}px</div>
              <div>图片位置: ({imageRect.x.toFixed(0)}, {imageRect.y.toFixed(0)})</div>
              <div>图片原始尺寸: {imageNaturalSize.width}×{imageNaturalSize.height}</div>
              <div>标签风格: {fixedLabels ? '固定位置' : '智能浮动'}</div>
              {selectedRoom && (
                <>
                  <div className="font-bold mt-1">选中房间坐标</div>
                  <div>相对坐标: ({selectedRoom.coordinates.x.toFixed(2)}%, {selectedRoom.coordinates.y.toFixed(2)}%)</div>
                  <div>像素坐标: ({(imageRect.x + (selectedRoom.coordinates.x/100)*imageRect.width).toFixed(0)}px, {(imageRect.y + (selectedRoom.coordinates.y/100)*imageRect.height).toFixed(0)}px)</div>
                </>
              )}
              
              <button
                className="mt-2 px-2 py-1 w-full text-center rounded-md bg-blue-500 hover:bg-blue-600 text-white"
                onClick={convertToRelativeCoordinates}
              >
                转换为相对坐标
              </button>
            </div>
            
            <button
              className={`mt-2 px-2 py-1 w-full text-center rounded-md ${showLabels ? 
                'bg-red-500 hover:bg-red-600 text-white' : 
                'bg-green-500 hover:bg-green-600 text-white'}`}
              onClick={() => {
                toggleLabels();
                forceRerender();
              }}
            >
              {showLabels ? '隐藏所有标签' : '显示所有标签'}
            </button>
            <div className="mt-2 text-xs text-gray-500">
              状态变化后，请尝试移动鼠标激活渲染
            </div>
          </div>
        )}
        
        {/* Sidebar */}
        <aside className="absolute left-4 top-4 z-40 hidden lg:block w-80 shrink-0">
          <div className="space-y-4">
            {/* Stats Card */}
            <div className={commonStyles.card}>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={18} className="text-blue-500" />
                统计信息
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ROOM_TYPES).map(([type, info]) => (
                  <div key={type} className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {rooms.filter(r => r.type === type).length}
                    </div>
                    <div className="text-xs text-gray-600">{info.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room List Card */}
            <div className={`${commonStyles.card} max-h-[50vh] overflow-y-auto`}>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" />
                位置列表 ({filteredRooms.length})
              </h3>

              {filteredRooms.length ? (
                <div className="space-y-2">
                  {filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 hover:bg-white/80 hover:shadow-md group 
                        ${hoveredRoom === room.id ? 'bg-white/80 shadow-md' : 'bg-gray-50/50'}`}
                      onClick={() => setSelectedRoom(room)}
                      onMouseEnter={() => setHoveredRoom(room.id)}
                      onMouseLeave={() => setHoveredRoom(null)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${getRoomColor(room.type)} rounded-lg flex items-center justify-center text-white shadow-lg`}>
                          {getRoomIcon(room.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{room.name}</div>
                          <div className="text-sm text-gray-500 truncate">{room.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search size={24} className="mx-auto mb-2 opacity-50" />
                  <p>未找到匹配的房间</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Map Container */}
        <div className="h-full">
          <div className="h-full bg-white/70 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden">
            <div
              ref={mapRef}
              className="relative w-full h-full overflow-hidden bg-gradient-to-br from-green-50 to-green-100"
              style={{ cursor: devMode ? 'crosshair' : 'default' }}
              onClick={(e) => {
                if (!devMode || !(e.metaKey || e.ctrlKey) || e.button !== 0 || !mapRef.current || e.target !== e.currentTarget) return;
                const rect = mapRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left);
                const y = (e.clientY - rect.top);
                addNewRoom(x, y);
              }}
            >
              <div className="relative w-full h-full">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  className="block select-none w-full h-full object-contain"
                  draggable={false}
                  alt="Floor plan"
                  onLoad={(e) => {
                    // 图片加载完成后更新图片位置和尺寸状态
                    if (imageRef.current && mapRef.current) {
                      const imgElement = imageRef.current;
                      
                      // 保存图片的自然尺寸（原始尺寸）
                      setImageNaturalSize({
                        width: imgElement.naturalWidth,
                        height: imgElement.naturalHeight
                      });
                      
                      console.log(`图片加载完成，原始尺寸: ${imgElement.naturalWidth}x${imgElement.naturalHeight}`);
                      
                      // 触发一次尺寸计算
                      const mapRect = mapRef.current.getBoundingClientRect();
                      const containerWidth = mapRect.width;
                      const containerHeight = mapRect.height;
                      
                      // 计算图片在保持纵横比的情况下的实际尺寸
                      const imgRatio = imgElement.naturalWidth / imgElement.naturalHeight;
                      const containerRatio = containerWidth / containerHeight;
                      
                      let actualWidth, actualHeight;
                      
                      if (imgRatio > containerRatio) {
                        // 图片更宽，将以宽度为限制
                        actualWidth = containerWidth;
                        actualHeight = containerWidth / imgRatio;
                      } else {
                        // 图片更高，将以高度为限制
                        actualHeight = containerHeight;
                        actualWidth = containerHeight * imgRatio;
                      }
                      
                      // 计算图片在容器中居中后的偏移量
                      const offsetX = (containerWidth - actualWidth) / 2;
                      const offsetY = (containerHeight - actualHeight) / 2;
                      
                      // 更新图片实际渲染区域信息
                      setImageRect({
                        x: offsetX,
                        y: offsetY,
                        width: actualWidth,
                        height: actualHeight
                      });
                      
                      console.log(`图片加载初始尺寸: ${actualWidth.toFixed(0)}x${actualHeight.toFixed(0)}, 位置: (${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`);
                    }
                  }}
                />

                {rooms.map(renderRoomPin)}

                {/* Dev mode instructions */}
                {devMode && (
                  <div className="absolute top-4 left-4 bg-orange-100/90 backdrop-blur-sm border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                    <div className="font-medium mb-1">开发者模式</div>
                    <div className="space-y-1 text-xs">
                      <div>• Cmd/Ctrl + 左键点击：添加新位置</div>
                      <div>• 拖拽：移动位置点</div>
                    </div>
                    <button
                      onClick={() => {
                        if (mapRef.current) {
                          const rect = mapRef.current.getBoundingClientRect();
                          addNewRoom(rect.width / 2, rect.height / 2);
                        }
                      }}
                      className="mt-2 w-full px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      在中心添加位置点
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[80vw] bg-white/95 backdrop-blur-xl shadow-2xl">
            <div className="p-4 border-b border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">位置导航</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索..."
                  className={`${commonStyles.input} pl-9`}
                />
              </div>
            </div>
            <div className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors mb-2"
                  onClick={() => {
                    setSelectedRoom(room);
                    setDrawerOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${getRoomColor(room.type)} rounded-lg flex items-center justify-center text-white`}>
                      {getRoomIcon(room.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{room.name}</div>
                      <div className="text-sm text-gray-500 truncate">{room.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedRoom(null)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className={`${getRoomColor(selectedRoom.type)} p-6 text-white relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      {getRoomIcon(selectedRoom.type)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedRoom.name}</h2>
                      <div className="text-white/80 text-sm capitalize">
                        {ROOM_TYPES[selectedRoom.type as keyof typeof ROOM_TYPES]?.label || '其他'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {devMode && (
                      <button
                        onClick={() => setEditingRoom(selectedRoom)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">详细信息</h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedRoom.description || "暂无详细描述信息"}
                </p>
                {selectedRoom.tags && selectedRoom.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedRoom.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {selectedRoom.photos && selectedRoom.photos.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Camera size={18} />
                    照片展示 ({selectedRoom.photos.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedRoom.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentPhotoIndex(index);
                          setShowPhotoViewer(true);
                        }}
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <img
                          src={photo}
                          alt={`${selectedRoom.name} 照片 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 
                    hover:bg-gray-100 hover:border-gray-400 hover:shadow-md 
                    active:bg-gray-200 active:scale-[0.98] active:shadow-sm
                    transition-all duration-200 ease-in-out"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showPhotoViewer && selectedRoom?.photos && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowPhotoViewer(false)}
          />
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowPhotoViewer(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <img
                src={selectedRoom.photos[currentPhotoIndex]}
                alt={`${selectedRoom.name} 照片`}
                className="w-full max-h-[70vh] object-contain"
              />
              
              {selectedRoom.photos.length > 1 && (
                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPhotoIndex((i) => 
                      i === 0 ? selectedRoom.photos!.length - 1 : i - 1
                    )}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    disabled={selectedRoom.photos.length <= 1}
                  >
                    上一张
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    {currentPhotoIndex + 1} / {selectedRoom.photos.length}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPhotoIndex((i) => 
                      i === selectedRoom.photos!.length - 1 ? 0 : i + 1
                    )}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    disabled={selectedRoom.photos.length <= 1}
                  >
                    下一张
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Edit Modal */}
      {editingRoom && devMode && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingRoom(null)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">编辑房间信息</h2>
                <button
                  onClick={() => setEditingRoom(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">房间名称</label>
                <input
                  type="text"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})}
                  className={commonStyles.input}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingRoom.description}
                  onChange={(e) => setEditingRoom({...editingRoom, description: e.target.value})}
                  rows={3}
                  className={commonStyles.input}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value})}
                  className={commonStyles.input}
                >
                  {Object.entries(ROOM_TYPES).map(([value, info]) => (
                    <option key={value} value={value}>{info.label}</option>
                  ))}
                </select>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Camera size={16} />
                  照片管理
                </label>
                
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        console.log('文件选择事件触发');
                        if (e.target.files && e.target.files.length > 0) {
                          console.log(`已选择 ${e.target.files.length} 个文件`);
                          handlePhotoUpload(editingRoom.id, e.target.files);
                        }
                      }}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Upload size={20} />
                      <span>上传照片</span>
                    </label>
                  </div>

                  {/* Debug Info */}
                  <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-500">
                    <div>房间ID: {editingRoom.id}</div>
                    <div>照片数量: {editingRoom.photos ? editingRoom.photos.length : '无'}</div>
                    {editingRoom.photos && editingRoom.photos.length > 0 && (
                      <div className="truncate">第一张照片: {typeof editingRoom.photos[0] === 'string' ? editingRoom.photos[0].substring(0, 30) + '...' : '非字符串'}</div>
                    )}
                  </div>

                  {/* Current Photos */}
                  {editingRoom.photos && editingRoom.photos.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">当前照片 ({editingRoom.photos.length})</div>
                      <div className="grid grid-cols-3 gap-2">
                        {editingRoom.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`照片 ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <button
                              onClick={() => {
                                const newPhotos = [...editingRoom.photos || []].filter((_, i) => i !== index);
                                setEditingRoom({...editingRoom, photos: newPhotos.length > 0 ? newPhotos : undefined});
                              }}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 标签管理 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Tag size={16} />
                  标签管理
                </label>
                <div className="space-y-3">
                  {/* 标签输入 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="输入标签后按回车添加"
                      className={commonStyles.input}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const value = input.value.trim();
                          if (value) {
                            const newTags = [...(editingRoom.tags || []), value];
                            setEditingRoom({...editingRoom, tags: newTags});
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>

                  {/* 当前标签列表 */}
                  {editingRoom.tags && editingRoom.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingRoom.tags.map((tag, index) => (
                        <div
                          key={index}
                          className="group flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => {
                              const newTags = editingRoom.tags?.filter((_, i) => i !== index);
                              setEditingRoom({...editingRoom, tags: newTags});
                            }}
                            className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setEditingRoom(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateRoom(editingRoom.id, editingRoom);
                  if (selectedRoom?.id === editingRoom.id) {
                    setSelectedRoom(editingRoom);
                  }
                  setEditingRoom(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}