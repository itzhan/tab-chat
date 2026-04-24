import { Button, Flex, Input } from 'antd';
import { memo, useEffect, useState } from 'react';

interface ParametersEditorProps {
  onChange?: (value: Record<string, unknown> | undefined) => void;
  value?: Record<string, unknown>;
}

const IMAGE_PRESET = {
  imageUrls: { default: [] },
  // Ask the upstream to return WebP at ~80 quality so we don't upload
  // 2MB PNGs to object storage. Users can still switch format / raise
  // quality per-generation if they need lossless output.
  output_compression: { default: 100 },
  output_format: { default: 'webp', enum: ['webp', 'png', 'jpeg'] },
  prompt: { default: '' },
  size: {
    // Default to 1K to keep per-image storage cost bounded; 2K tiers stay
    // available for users who explicitly pick them.
    default: '1024x1024',
    enum: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792', 'auto'],
  },
};

const VIDEO_PRESET = {
  prompt: { default: '' },
  size: { default: '1280x720', enum: ['1280x720', '720x1280', '1024x1024'] },
};

const ParametersEditor = memo<ParametersEditorProps>(({ value, onChange }) => {
  const [text, setText] = useState<string>(() => (value ? JSON.stringify(value, null, 2) : ''));
  const [error, setError] = useState<string | undefined>();

  // sync when outer value changes (e.g., editing another model)
  useEffect(() => {
    const next = value ? JSON.stringify(value, null, 2) : '';
    if (next !== text) {
      setText(next);
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw: string) => {
    setText(raw);
    if (!raw.trim()) {
      setError(undefined);
      onChange?.(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('必须是 JSON 对象');
        return;
      }
      setError(undefined);
      onChange?.(parsed as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const applyPreset = (preset: Record<string, unknown>) => {
    const raw = JSON.stringify(preset, null, 2);
    setText(raw);
    setError(undefined);
    onChange?.(preset);
  };

  return (
    <Flex vertical gap={8}>
      <Flex gap={8}>
        <Button size="small" onClick={() => applyPreset(IMAGE_PRESET)}>
          使用图片默认参数（gpt-image 兼容）
        </Button>
        <Button size="small" onClick={() => applyPreset(VIDEO_PRESET)}>
          使用视频默认参数
        </Button>
        <Button
          size="small"
          onClick={() => {
            setText('');
            setError(undefined);
            onChange?.(undefined);
          }}
        >
          清空
        </Button>
      </Flex>
      <Input.TextArea
        autoSize={{ maxRows: 20, minRows: 8 }}
        placeholder={'例：{ "prompt": { "default": "" }, "size": { "default": "1024x1024" } }'}
        status={error ? 'error' : undefined}
        style={{ fontFamily: 'monospace' }}
        value={text}
        onBlur={(e) => commit(e.target.value)}
        onChange={(e) => commit(e.target.value)}
      />
      {error ? (
        <span style={{ color: 'var(--ant-color-error)', fontSize: 12 }}>{error}</span>
      ) : (
        <span style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 12 }}>
          图片/视频类型模型必须填写参数 schema，定义生成时可传的字段与默认值
        </span>
      )}
    </Flex>
  );
});

export default ParametersEditor;
