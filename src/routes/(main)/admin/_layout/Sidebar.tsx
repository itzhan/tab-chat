import { Flexbox, Text } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Layout, Package, Rocket, Server, Sparkles, UserCog, Users } from 'lucide-react';
import { memo } from 'react';
import { NavLink } from 'react-router-dom';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    width: 220px;
    padding-block: 16px;
    padding-inline: 12px;
    border-inline-end: 1px solid ${token.colorBorderSecondary};

    background: ${token.colorBgContainer};
  `,
  heading: css`
    padding-block: 8px 16px;
    padding-inline: 12px;

    font-size: 12px;
    font-weight: 600;
    color: ${token.colorTextTertiary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
  `,
  link: css`
    display: flex;
    gap: 10px;
    align-items: center;

    padding-block: 8px;
    padding-inline: 12px;
    border-radius: 8px;

    font-size: 14px;
    color: ${token.colorText};

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  linkActive: css`
    font-weight: 600;
    background: ${token.colorFillSecondary};
  `,
}));

const items = [
  { icon: Package, label: '套餐管理', to: '/admin/plans' },
  { icon: Users, label: '用户管理', to: '/admin/users' },
  { icon: Rocket, label: '加油包', to: '/admin/boost-packs' },
  { icon: Server, label: '服务商配置', to: '/admin/providers' },
  { icon: Layout, label: '侧栏菜单', to: '/admin/sidebar' },
  { icon: Sparkles, label: '技能开放', to: '/admin/skills' },
  { icon: UserCog, label: '管理员', to: '/admin/admins' },
];

const AdminSidebar = memo(() => {
  const { styles, cx } = useStyles();

  return (
    <Flexbox className={styles.container} gap={4}>
      <Text className={styles.heading}>Admin</Text>
      {items.map(({ icon: Icon, label, to }) => (
        <NavLink
          className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}
          key={to}
          to={to}
        >
          <Icon size={16} />
          <span>{label}</span>
        </NavLink>
      ))}
    </Flexbox>
  );
});

export default AdminSidebar;
