import { Link } from '@tanstack/react-router';

function TabNavigation() {
  return (
    <div className="tab-navigation">
      <Link
        to="/usdc"
        className="tab-button"
        activeProps={{ className: 'active' }}
      >
        USDC Balance
      </Link>
      <Link
        to="/playground"
        className="tab-button"
        activeProps={{ className: 'active' }}
      >
        Contract Playground
      </Link>
    </div>
  );
}

export default TabNavigation;
