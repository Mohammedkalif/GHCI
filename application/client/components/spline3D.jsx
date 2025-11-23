// file: src/components/Spline3D.js
import { requireNativeComponent, ViewStyle } from 'react-native';
import React from 'react';
import PropTypes from 'prop-types';

const RNSplineView = requireNativeComponent('RNSplineView');

const Spline3D = ({ style }) => {
  return <RNSplineView style={style} />;
};

Spline3D.propTypes = {
  // url: PropTypes.string.isRequired,
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default Spline3D;
